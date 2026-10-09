
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const tableBody = $("classesTableBody");
    const classModal = $("classModal");
    const classForm = $("classForm");
    const saveButton = $("saveClassButton");
    const pageMessage = $("pageMessage");
    const modalMessage = $("modalMessage");
    const toast = $("adminToast");

    let classes = [];
    let batches = [];
    let editingId = null;
    let toastTimer;

    // Database-allowed live_classes.status values:
    // DRAFT, ACTIVE, COMPLETED, INACTIVE
    const STATUS = Object.freeze({
        DRAFT: "DRAFT",
        PUBLISHED: "ACTIVE",
        COMPLETED: "COMPLETED",
        CANCELLED: "INACTIVE"
    });

    if (!window.supabase || !window.supabaseClient) {
        showPageMessage(
            "Supabase initialization failed. Check ../js/supabase.js.",
            "error"
        );
        return;
    }

    const db = window.supabaseClient;

    try {
        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError) throw sessionError;

        if (!sessionData?.session) {
            location.href = "login.html";
            return;
        }

        const { data: isAdmin, error: adminError } =
            await db.rpc("is_admin");

        if (adminError) throw adminError;

        if (!isAdmin) {
            await db.auth.signOut();
            location.href = "login.html";
            return;
        }

        await loadBatches();
        await loadClasses();
    } catch (error) {
        console.error("Live Classes initialization:", error);
        showPageMessage(
            error.message || "Unable to initialize Live Classes.",
            "error"
        );
    }

    $("addClassButton").addEventListener("click", () => openModal());
    $("closeModalButton").addEventListener("click", closeModal);
    $("cancelModalButton").addEventListener("click", closeModal);
    $("refreshButton").addEventListener("click", refresh);
    $("logoutButton").addEventListener("click", logout);
    $("classSearch").addEventListener("input", renderClasses);
    $("batchFilter").addEventListener("change", renderClasses);
    $("statusFilter").addEventListener("change", renderClasses);
    classForm.addEventListener("submit", saveClass);

    classModal.addEventListener("click", (event) => {
        if (event.target === classModal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            classModal.classList.contains("open")
        ) {
            closeModal();
        }
    });

    async function refresh() {
        const refreshButton = $("refreshButton");
        refreshButton.disabled = true;

        try {
            await loadBatches();
            await loadClasses();
            showToast("Live Classes refreshed.", "success");
        } catch (error) {
            console.error("Refresh live classes:", error);
            showToast(error.message || "Unable to refresh classes.", "error");
        } finally {
            refreshButton.disabled = false;
        }
    }

    async function loadBatches() {
        const { data, error } = await db
            .from("batches")
            .select("id,name,batch_code,status,program_id")
            .order("start_date", { ascending: true });

        if (error) throw error;

        batches = data || [];

        const selectedFilter = $("batchFilter").value;
        const selectedModal = $("classBatch").value;

        $("batchFilter").innerHTML =
            '<option value="ALL">All Batches</option>';

        $("classBatch").innerHTML =
            '<option value="">Select active batch</option>';

        batches.forEach((batch) => {
            const label =
                `${batch.name || "Unnamed batch"} (${batch.batch_code || ""})`;

            const filterOption = document.createElement("option");
            filterOption.value = batch.id;
            filterOption.textContent = label;
            $("batchFilter").appendChild(filterOption);

            if (batch.status === "ACTIVE") {
                const option = document.createElement("option");
                option.value = batch.id;
                option.textContent = label;
                $("classBatch").appendChild(option);
            }
        });

        if (
            [...$("batchFilter").options].some(
                (option) => option.value === selectedFilter
            )
        ) {
            $("batchFilter").value = selectedFilter;
        }

        if (
            [...$("classBatch").options].some(
                (option) => option.value === selectedModal
            )
        ) {
            $("classBatch").value = selectedModal;
        }
    }

    async function loadClasses() {
        tableBody.innerHTML =
            '<tr><td colspan="6">Loading classes...</td></tr>';

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
                created_by,
                created_at,
                updated_at,
                batches ( id, name, batch_code )
            `)
            .order("starts_at", { ascending: true });

        if (error) throw error;

        classes = data || [];

        updateStats();
        renderClasses();
    }

    function updateStats() {
        $("totalClasses").textContent = classes.length;

        $("publishedClasses").textContent = classes.filter(
            (item) => item.status === STATUS.PUBLISHED
        ).length;

        $("upcomingClasses").textContent = classes.filter(
            (item) =>
                item.status === STATUS.PUBLISHED &&
                new Date(item.starts_at).getTime() >= Date.now()
        ).length;
    }

    function renderClasses() {
        const search = $("classSearch").value.trim().toLowerCase();
        const batchFilter = $("batchFilter").value;
        const statusFilter = $("statusFilter").value;

        const filtered = classes.filter((item) => {
            const batch = item.batches;

            const searchable = [
                item.title,
                item.description,
                batch?.name,
                batch?.batch_code
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                (!search || searchable.includes(search)) &&
                (batchFilter === "ALL" || item.batch_id === batchFilter) &&
                (statusFilter === "ALL" || item.status === statusFilter)
            );
        });

        if (!filtered.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="admin-state">
                            <p class="admin-state-title">No classes found</p>
                            <p class="admin-state-text">
                                Schedule a class or adjust the filters.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map((item) => {
            const batch = item.batches;

            const statusClass = item.status === STATUS.PUBLISHED
                ? "admin-status-active"
                : "admin-status-inactive";

            let actionButton = "";

            if (item.status === STATUS.PUBLISHED) {
                actionButton = `
                    <button
                        type="button"
                        class="admin-btn admin-btn-danger admin-btn-small"
                        data-action="cancel"
                        data-id="${escapeHtml(item.id)}">
                        Cancel
                    </button>
                `;
            } else if (
                item.status !== STATUS.CANCELLED &&
                item.status !== STATUS.COMPLETED
            ) {
                actionButton = `
                    <button
                        type="button"
                        class="admin-btn admin-btn-primary admin-btn-small"
                        data-action="publish"
                        data-id="${escapeHtml(item.id)}">
                        Publish
                    </button>
                `;
            }

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(item.title)}</strong>
                        <div class="live-meta">
                            ${escapeHtml(item.description || "")}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(batch?.name || "Unknown batch")}
                        <div class="live-meta">
                            ${escapeHtml(batch?.batch_code || "")}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(formatDateTime(item.starts_at))}
                        <div class="live-meta">
                            Ends: ${escapeHtml(formatDateTime(item.ends_at))}
                        </div>
                    </td>

                    <td>
                        <span class="admin-status ${statusClass}">
                            ${escapeHtml(getStatusLabel(item.status))}
                        </span>
                    </td>

                    <td>
                        <a
                            class="live-link"
                            href="${safeUrl(item.meet_link)}"
                            target="_blank"
                            rel="noopener noreferrer">
                            Open Meet
                        </a>
                    </td>

                    <td>
                        <div class="admin-actions">
                            <button
                                type="button"
                                class="admin-btn admin-btn-secondary admin-btn-small"
                                data-action="edit"
                                data-id="${escapeHtml(item.id)}">
                                Edit
                            </button>
                            ${actionButton}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        tableBody.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", async () => {
                const item = classes.find(
                    (row) => row.id === button.dataset.id
                );

                if (!item) return;

                if (button.dataset.action === "edit") {
                    openModal(item);
                } else if (button.dataset.action === "publish") {
                    await changeStatus(item, STATUS.PUBLISHED);
                } else if (button.dataset.action === "cancel") {
                    await changeStatus(item, STATUS.CANCELLED);
                }
            });
        });
    }

    function getStatusLabel(status) {
        switch (status) {
            case STATUS.PUBLISHED:
                return "Published";
            case STATUS.CANCELLED:
                return "Cancelled";
            case STATUS.COMPLETED:
                return "Completed";
            case STATUS.DRAFT:
                return "Draft";
            default:
                return status || "Unknown";
        }
    }

    function openModal(item = null) {
        editingId = item?.id || null;

        clearModalMessage();
        classForm.reset();

        $("classModalTitle").textContent =
            item ? "Edit Live Class" : "Schedule Live Class";

        saveButton.textContent = item ? "Update Class" : "Save Class";

        if (item) {
            $("classTitle").value = item.title || "";
            $("classBatch").value = item.batch_id || "";
            $("classStart").value = toLocalInput(item.starts_at);
            $("classEnd").value = toLocalInput(item.ends_at);
            $("meetLink").value = item.meet_link || "";
            $("classDescription").value = item.description || "";
            $("recordingUrl").value = item.recording_url || "";
            $("classStatus").value = item.status || STATUS.DRAFT;

            if (
                ![...$("classBatch").options].some(
                    (option) => option.value === item.batch_id
                )
            ) {
                const option = document.createElement("option");
                option.value = item.batch_id;
                option.textContent =
                    `${item.batches?.name || "Existing batch"} ` +
                    `(${item.batches?.batch_code || ""})`;

                $("classBatch").appendChild(option);
                $("classBatch").value = item.batch_id;
            }
        } else {
            $("classStatus").value = STATUS.DRAFT;
        }

        classModal.classList.add("open");
        classModal.setAttribute("aria-hidden", "false");
        $("classTitle").focus();
    }

    function closeModal() {
        classModal.classList.remove("open");
        classModal.setAttribute("aria-hidden", "true");
        editingId = null;
        clearModalMessage();
    }

    async function saveClass(event) {
        event.preventDefault();
        clearModalMessage();

        const wasEditing = Boolean(editingId);
        const currentEditingId = editingId;

        const title = $("classTitle").value.trim();
        const batchId = $("classBatch").value;
        const startValue = $("classStart").value;
        const endValue = $("classEnd").value;
        const meetLink = $("meetLink").value.trim();
        const recordingUrl = $("recordingUrl").value.trim();
        const description = $("classDescription").value.trim();
        const status = $("classStatus").value;

        const startsAt = new Date(startValue);
        const endsAt = new Date(endValue);

        if (!title || !batchId || !startValue || !endValue || !meetLink) {
            showModalMessage("Complete all required fields.", "error");
            return;
        }

        if (
            Number.isNaN(startsAt.getTime()) ||
            Number.isNaN(endsAt.getTime()) ||
            endsAt <= startsAt
        ) {
            showModalMessage(
                "End date/time must be later than start date/time.",
                "error"
            );
            return;
        }

        if (!validHttpsUrl(meetLink)) {
            showModalMessage(
                "Enter a valid HTTPS Google Meet URL.",
                "error"
            );
            return;
        }

        if (recordingUrl && !validHttpsUrl(recordingUrl)) {
            showModalMessage(
                "Recording URL must use HTTPS.",
                "error"
            );
            return;
        }

        // Reject values not accepted by the database constraint.
        const allowedStatuses = Object.values(STATUS);

        if (!allowedStatuses.includes(status)) {
            showModalMessage(
                "Invalid class status. Select a valid status.",
                "error"
            );
            return;
        }

        const batch = batches.find((item) => item.id === batchId);
        const existingClass = classes.find(
            (item) => item.id === currentEditingId
        );

        if (
            !batch ||
            (
                batch.status !== "ACTIVE" &&
                batchId !== existingClass?.batch_id
            )
        ) {
            showModalMessage("Select an active batch.", "error");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = wasEditing ? "Updating..." : "Saving...";

        try {
            const { data: sessionData, error: sessionError } =
                await db.auth.getSession();

            if (sessionError) throw sessionError;

            const userId = sessionData?.session?.user?.id;

            if (!userId) {
                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            const payload = {
                batch_id: batchId,
                title,
                description: description || null,
                meet_link: meetLink,
                recording_url: recordingUrl || null,
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                status,
                updated_at: new Date().toISOString()
            };

            let query;

            if (wasEditing) {
                query = db
                    .from("live_classes")
                    .update(payload)
                    .eq("id", currentEditingId);
            } else {
                payload.created_by = userId;

                query = db
                    .from("live_classes")
                    .insert(payload);
            }

            const { error } = await query;

            if (error) throw error;

            closeModal();

            showToast(
                wasEditing ? "Class updated." : "Class scheduled.",
                "success"
            );

            await loadClasses();
        } catch (error) {
            console.error("Save live class:", error);

            showModalMessage(
                error.message || "Unable to save class.",
                "error"
            );
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = wasEditing
                ? "Update Class"
                : "Save Class";
        }
    }

    async function changeStatus(item, status) {
        const isPublishing = status === STATUS.PUBLISHED;

        const message = isPublishing
            ? `Publish "${item.title}" for its batch?`
            : `Cancel "${item.title}"?`;

        if (!confirm(message)) return;

        try {
            const { error } = await db
                .from("live_classes")
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq("id", item.id);

            if (error) throw error;

            showToast(
                isPublishing ? "Class published." : "Class cancelled.",
                "success"
            );

            await loadClasses();
        } catch (error) {
            console.error("Update class status:", error);

            showToast(
                error.message || "Status could not be updated.",
                "error"
            );
        }
    }

    async function logout() {
        const logoutButton = $("logoutButton");
        logoutButton.disabled = true;

        try {
            const { error } = await db.auth.signOut();
            if (error) throw error;

            location.href = "login.html";
        } catch (error) {
            console.error("Admin logout:", error);
            logoutButton.disabled = false;

            showToast(
                error.message || "Logout failed. Please try again.",
                "error"
            );
        }
    }

    function showPageMessage(message, type) {
        if (!pageMessage) {
            console.error(message);
            return;
        }

        pageMessage.textContent = message;
        pageMessage.className = `admin-form-message ${type}`;
        pageMessage.style.display = "block";
    }

    function showModalMessage(message, type) {
        modalMessage.textContent = message;
        modalMessage.className = `admin-form-message ${type}`;
        modalMessage.style.display = "block";
    }

    function clearModalMessage() {
        modalMessage.textContent = "";
        modalMessage.className = "admin-form-message";
        modalMessage.style.display = "none";
    }

    function showToast(message, type = "success") {
        if (!toast) {
            console.log(message);
            return;
        }

        clearTimeout(toastTimer);

        toast.textContent = message;
        toast.className = `admin-toast ${type} show`;

        toastTimer = setTimeout(() => {
            toast.className = "admin-toast";
        }, 3000);
    }

    function formatDateTime(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function toLocalInput(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const offset = date.getTimezoneOffset();

        return new Date(date.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 16);
    }

    function validHttpsUrl(value) {
        try {
            return new URL(value).protocol === "https:";
        } catch {
            return false;
        }
    }

    function safeUrl(value) {
        return validHttpsUrl(value) ? escapeHtml(value) : "#";
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
});
