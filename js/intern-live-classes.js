
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const grid = $("classesGrid");
    const message = $("pageMessage");
    const refreshButton = $("refreshButton");
    const logoutButton = $("logoutButton");
    const searchInput = $("classSearch");

    let classes = [];
    let refreshTimer = null;

    if (!grid || !window.supabaseClient) {
        showMessage(
            "Supabase initialization failed. Please refresh the page.",
            "error"
        );
        showState(
            "Connection unavailable",
            "Please refresh the page or contact support."
        );
        return;
    }

    const db = window.supabaseClient;

    try {
        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError) throw sessionError;

        if (!sessionData?.session) {
            window.location.href = "../login.html";
            return;
        }

        await loadClasses();

        /*
         * Update class status automatically while the page stays open.
         * This only changes the displayed status; it does not modify
         * the database or change the scheduled start/end times.
         */
        refreshTimer = window.setInterval(() => {
            updateStats();
            renderClasses();
        }, 30000);

    } catch (error) {
        console.error("Intern Live Classes initialization:", error);

        showMessage(
            error.message || "Unable to load live classes.",
            "error"
        );

        showState(
            "Classes could not be loaded",
            "Please refresh the page. If the problem continues, contact support."
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", async () => {
            refreshButton.disabled = true;

            try {
                await loadClasses();
            } catch (error) {
                console.error("Refresh classes:", error);

                showMessage(
                    error.message || "Unable to refresh classes.",
                    "error"
                );
            } finally {
                refreshButton.disabled = false;
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderClasses);
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const dropdownLogoutButton = $("dropdownLogoutButton");

    if (dropdownLogoutButton) {
        dropdownLogoutButton.addEventListener("click", logout);
    }

    async function logout(event) {
        const button = event.currentTarget;
        button.disabled = true;

        try {
            const { error } = await db.auth.signOut();

            if (error) throw error;

            window.location.href = "../login.html";
        } catch (error) {
            console.error("Intern logout:", error);
            button.disabled = false;

            showMessage(
                error.message || "Logout failed. Please try again.",
                "error"
            );
        }
    }

    async function loadClasses() {
        showState(
            "Loading classes...",
            "Please wait while your scheduled classes are loaded."
        );

        /*
         * ACTIVE is the published status used by the current module.
         * Scheduled status is calculated from starts_at and ends_at.
         * Recording availability is calculated from recording_url.
         */
        const { data, error } = await db
            .from("live_classes")
            .select(`
                id,
                batch_id,
                title,
                description,
                meet_link,
                recording_url,
                starts_at,
                ends_at,
                status,
                batches (
                    id,
                    name,
                    batch_code
                )
            `)
            .eq("status", "ACTIVE")
            .order("starts_at", { ascending: true });

        if (error) throw error;

        classes = (data || []).filter((item) => {
            return item.starts_at && item.ends_at;
        });

        updateStats();
        renderClasses();

        if (message) {
            message.textContent = "";
            message.hidden = true;
            message.className = "live-page-message";
        }
    }

    function updateStats() {
        const now = Date.now();

        const upcoming = classes.filter((item) => {
            const start = new Date(item.starts_at).getTime();
            const end = new Date(item.ends_at).getTime();

            return start > now && end >= now;
        });

        const completed = classes.filter((item) => {
            return new Date(item.ends_at).getTime() < now;
        });

        setText("totalClasses", classes.length);
        setText("upcomingClasses", upcoming.length);
        setText("completedClasses", completed.length);
    }

    function renderClasses() {
        if (!grid) return;

        const search = (searchInput?.value || "")
            .trim()
            .toLowerCase();

        const filtered = classes.filter((item) => {
            const batch = getBatch(item);

            const searchableText = [
                item.title,
                item.description,
                batch?.name,
                batch?.batch_code
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return !search || searchableText.includes(search);
        });

        if (!filtered.length) {
            showState(
                search
                    ? "No matching classes found"
                    : "No live classes available",
                search
                    ? "Try another search term."
                    : "Published classes for your assigned batch will appear here."
            );
            return;
        }

        const sorted = [...filtered].sort((a, b) => {
            return new Date(a.starts_at) - new Date(b.starts_at);
        });

        grid.innerHTML = sorted.map((item) => {
            const now = Date.now();
            const start = new Date(item.starts_at).getTime();
            const end = new Date(item.ends_at).getTime();

            const isUpcoming = now < start;
            const isLive = now >= start && now <= end;
            const isCompleted = now > end;

            const hasRecording = validHttpsUrl(item.recording_url);
            const hasMeetLink = validHttpsUrl(item.meet_link);

            let statusLabel;
            let statusClass;
            let actionMarkup;

            if (isCompleted) {
                if (hasRecording) {
                    statusLabel = "Recorded Class";
                    statusClass = "completed";

                    actionMarkup = `
                        <a
                            class="live-action-button primary"
                            href="${escapeHtml(item.recording_url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span aria-hidden="true">▶</span>
                            Watch Recording
                        </a>
                    `;
                } else {
                    statusLabel = "Recording Pending";
                    statusClass = "completed";

                    actionMarkup = `
                        <span class="live-action-button" aria-disabled="true">
                            Recording Pending
                        </span>
                    `;
                }
            } else if (isLive) {
                statusLabel = "Live Now";
                statusClass = "live";

                actionMarkup = hasMeetLink
                    ? `
                        <a
                            class="live-action-button primary"
                            href="${escapeHtml(item.meet_link)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span aria-hidden="true">↗</span>
                            Join Google Meet
                        </a>
                    `
                    : `
                        <span class="live-action-button" aria-disabled="true">
                            Meeting Link Unavailable
                        </span>
                    `;
            } else {
                statusLabel = "Upcoming";
                statusClass = "";

                actionMarkup = hasMeetLink
                    ? `
                        <a
                            class="live-action-button primary"
                            href="${escapeHtml(item.meet_link)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span aria-hidden="true">↗</span>
                            Join Google Meet
                        </a>
                    `
                    : `
                        <span class="live-action-button" aria-disabled="true">
                            Meeting Link Unavailable
                        </span>
                    `;
            }

            const batch = getBatch(item);
            const batchName = batch?.name || "Assigned batch";
            const batchCode = batch?.batch_code
                ? ` (${escapeHtml(batch.batch_code)})`
                : "";

            return `
                <article class="live-class-card">

                    <div class="live-class-card-header">
                        <h4>${escapeHtml(item.title || "Live Class")}</h4>

                        <span class="live-class-badge ${statusClass}">
                            ${statusLabel}
                        </span>
                    </div>

                    <p class="live-class-description">
                        ${escapeHtml(
                            item.description ||
                            "No additional class instructions."
                        )}
                    </p>

                    <div class="live-class-details">

                        <div class="live-detail-item">
                            <span class="live-detail-label">Batch</span>
                            <span class="live-detail-value">
                                ${escapeHtml(batchName)}${batchCode}
                            </span>
                        </div>

                        <div class="live-detail-item">
                            <span class="live-detail-label">Start Time</span>
                            <span class="live-detail-value">
                                ${escapeHtml(formatDateTime(item.starts_at))}
                            </span>
                        </div>

                        <div class="live-detail-item">
                            <span class="live-detail-label">End Time</span>
                            <span class="live-detail-value">
                                ${escapeHtml(formatDateTime(item.ends_at))}
                            </span>
                        </div>

                        <div class="live-detail-item">
                            <span class="live-detail-label">Class Status</span>
                            <span class="live-detail-value">
                                ${statusLabel}
                            </span>
                        </div>

                    </div>

                    <div class="live-class-actions">
                        ${actionMarkup}
                    </div>

                </article>
            `;
        }).join("");
    }

    function getBatch(item) {
        if (Array.isArray(item.batches)) {
            return item.batches[0] || null;
        }

        return item.batches || null;
    }

    function showState(title, description) {
        if (!grid) return;

        grid.innerHTML = `
            <div class="live-empty-state">
                <span class="live-empty-icon" aria-hidden="true">◷</span>
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(description)}</p>
            </div>
        `;
    }

    function showMessage(text, type = "error") {
        if (!message) {
            console.error(text);
            return;
        }

        message.textContent = text;
        message.hidden = false;
        message.className = "live-page-message";

        if (type === "error") {
            message.style.background = "#fff0f0";
            message.style.borderColor = "#f3cccc";
            message.style.color = "#a92e2e";
        } else {
            message.style.background = "#f1f5ff";
            message.style.borderColor = "#d9e5ff";
            message.style.color = "#3153a6";
        }
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    function formatDateTime(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function validHttpsUrl(value) {
        if (!value || typeof value !== "string") {
            return false;
        }

        try {
            return new URL(value).protocol === "https:";
        } catch {
            return false;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    window.addEventListener("beforeunload", () => {
        if (refreshTimer) {
            window.clearInterval(refreshTimer);
        }
    });
});
