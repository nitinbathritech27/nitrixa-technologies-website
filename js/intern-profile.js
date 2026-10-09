
/* =========================================================
   NITRIXA TECHNOLOGIES
   INTERN PROFILE — STABLE INITIALIZATION

   Scope:
   - Profile page only
   - Existing Supabase client reused
   - Existing dashboard/shared JS untouched
   - No unverified profile-table writes
   - Completion percentage updates only on Save Profile click
   ========================================================= */

(function () {
    "use strict";

    const REQUEST_TIMEOUT_MS = 10000;

    let currentUser = null;
    let currentIntern = null;
    let initializationStarted = false;

    const $ = (id) => document.getElementById(id);

    function setText(id, value, fallback = "") {
        const element = $(id);
        if (!element) return;

        const result =
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
                ? String(value)
                : fallback;

        element.textContent = result;
    }

    function hideElement(id) {
        const element = $(id);
        if (!element) return;

        element.hidden = true;
        element.style.setProperty("display", "none", "important");
    }

    function showElement(id, display = "") {
        const element = $(id);
        if (!element) return;

        element.hidden = false;
        element.style.removeProperty("display");

        if (display) {
            element.style.display = display;
        }
    }

    function showError(message) {
        hideElement("profileLoadingState");
        hideElement("profilePageContent");
        showElement("profileErrorState");

        setText("profileErrorMessage", message);
        console.error("NITRIXA Profile:", message);
    }

    function withTimeout(promise, label) {
        let timeoutId;

        const timeoutPromise = new Promise((resolve, reject) => {
            timeoutId = window.setTimeout(() => {
                reject(
                    new Error(
                        label +
                        " timed out. Please check your connection and try again."
                    )
                );
            }, REQUEST_TIMEOUT_MS);
        });

        return Promise.race([promise, timeoutPromise])
            .finally(() => window.clearTimeout(timeoutId));
    }

    function getDisplayName(user) {
        const metadata = user?.user_metadata || {};

        return (
            metadata.full_name ||
            metadata.fullName ||
            metadata.name ||
            metadata.fullname ||
            user?.email?.split("@")[0] ||
            "Intern"
        );
    }

    function getInitials(name) {
        return String(name || "N")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "N";
    }

    function setInputValue(id, value) {
        const element = $(id);

        if (element && value !== null && value !== undefined) {
            element.value = String(value);
        }
    }

    function updateIdentity() {
        const name = getDisplayName(currentUser);
        const metadata = currentUser.user_metadata || {};
        const initials = getInitials(name);

        setText("sidebarInternName", name, "Intern");
        setText("topUserName", name, "Intern");

        setText(
            "sidebarInternId",
            currentIntern?.intern_id,
            "Registered User"
        );

        setText("internCurrentYear", new Date().getFullYear());

        setInputValue("profileFullName", name);
        setInputValue("profileEmail", currentUser.email || "");

        setInputValue(
            "profileMobile",
            metadata.phone || metadata.mobile || ""
        );

        setInputValue(
            "profileInternId",
            currentIntern?.intern_id || "Not assigned"
        );

        ["sidebarAvatar", "topAvatar"].forEach((id) => {
            const element = $(id);
            if (element) element.textContent = initials;
        });
    }

    async function loadInternRecord(userId) {
        const client = window.supabaseClient;

        try {
            const result = await withTimeout(
                client
                    .from("interns")
                    .select("id, user_id, intern_id, status")
                    .eq("user_id", userId)
                    .maybeSingle(),
                "Intern record lookup"
            );

            if (result.error) {
                console.warn(
                    "NITRIXA: Intern record lookup failed:",
                    result.error.message
                );

                return null;
            }

            return result.data || null;

        } catch (error) {
            console.warn(
                "NITRIXA: Continuing without an intern record:",
                error.message
            );

            return null;
        }
    }

    /*
     * Calculate the current form completion.
     *
     * IMPORTANT:
     * This function only calculates and returns a percentage.
     * It does not update the UI itself.
     */
    function calculateCompletion() {
        const fieldIds = [
            "profileGender",
            "profileDateOfBirth",
            "profileCity",
            "profileState",
            "profileCountry",
            "profileQualification",
            "profileCollege",
            "profileGraduationYear",
            "profileSkills",
            "profileGithub",
            "profileLinkedin",
            "profilePortfolio",
            "profileBio"
        ];

        const completed = fieldIds.filter((id) => {
            const field = $(id);

            return field && field.value.trim() !== "";
        }).length;

        return Math.round(
            (completed / fieldIds.length) * 100
        );
    }

    /*
     * Update the completion percentage only when called
     * from the Save Profile submit handler.
     */
    function updateCompletionDisplay(percentage) {
        setText("profileCompletionValue", percentage + "%");

        const visual = $("profileCompletionVisual");

        if (visual) {
            visual.style.setProperty(
                "--profile-completion",
                percentage + "%"
            );

            visual.setAttribute(
                "aria-label",
                "Profile completion: " + percentage + "%"
            );
        }
    }

    function showMessage(message, type = "info") {
        const element = $("profileMessage");
        if (!element) return;

        element.textContent = message;

        element.classList.remove(
            "is-success",
            "is-error",
            "is-info"
        );

        element.classList.add("is-" + type);

        showElement("profileMessage");
    }

    /*
     * Profile form:
     * - No automatic percentage updates while typing.
     * - Percentage updates only after Save Profile is clicked.
     * - No database writes until the profile schema is verified.
     */
    function initializeProfileForm() {
        const form = $("internProfileForm");

        if (!form) {
            console.error(
                "NITRIXA: internProfileForm was not found."
            );
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const percentage = calculateCompletion();

            // This is the ONLY place that updates the percentage.
            updateCompletionDisplay(percentage);

            showMessage(
                "Profile completion updated to " +
                percentage +
                "%. Your profile details have not been saved to the database yet.",
                "info"
            );
        });
    }

    function closeSidebar() {
        const sidebar = $("internSidebar");
        const overlay = $("internSidebarOverlay");
        const toggle = $("internSidebarToggle");

        if (sidebar) {
            sidebar.classList.remove("is-open");
        }

        if (overlay) {
            overlay.classList.remove("is-visible");
        }

        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
        }

        if (overlay) {
            overlay.setAttribute("aria-hidden", "true");
        }
    }

    function initializeSidebar() {
        const sidebar = $("internSidebar");
        const overlay = $("internSidebarOverlay");
        const toggle = $("internSidebarToggle");
        const close = $("internSidebarClose");

        if (toggle) {
            toggle.addEventListener("click", () => {
                if (sidebar?.classList.contains("is-open")) {
                    closeSidebar();
                } else {
                    if (sidebar) {
                        sidebar.classList.add("is-open");
                    }

                    if (overlay) {
                        overlay.classList.add("is-visible");
                    }

                    toggle.setAttribute("aria-expanded", "true");

                    if (overlay) {
                        overlay.setAttribute("aria-hidden", "false");
                    }
                }
            });
        }

        if (close) {
            close.addEventListener("click", closeSidebar);
        }

        if (overlay) {
            overlay.addEventListener("click", closeSidebar);
        }

        document.querySelectorAll(".intern-nav-link").forEach((link) => {
            link.addEventListener("click", closeSidebar);
        });
    }

    function closeUserDropdown() {
        const dropdown = $("userDropdown");
        const button = $("userMenuButton");

        if (dropdown) {
            hideElement("userDropdown");
        }

        if (button) {
            button.setAttribute("aria-expanded", "false");
        }
    }

    function initializeUserDropdown() {
        const button = $("userMenuButton");
        const dropdown = $("userDropdown");

        if (!button || !dropdown) return;

        button.addEventListener("click", (event) => {
            event.stopPropagation();

            const shouldOpen = dropdown.hidden;

            if (shouldOpen) {
                showElement("userDropdown");
            } else {
                hideElement("userDropdown");
            }

            button.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );
        });

        document.addEventListener("click", (event) => {
            if (
                !dropdown.contains(event.target) &&
                !button.contains(event.target)
            ) {
                closeUserDropdown();
            }
        });
    }

    async function logout() {
        const client = window.supabaseClient;

        if (!client?.auth) {
            showMessage(
                "Authentication service is unavailable. Refresh the page and try again.",
                "error"
            );
            return;
        }

        const buttons = [
            $("internLogoutButton"),
            $("dropdownLogoutButton")
        ].filter(Boolean);

        buttons.forEach((button) => {
            button.disabled = true;
        });

        try {
            const result = await withTimeout(
                client.auth.signOut(),
                "Logout"
            );

            if (result.error) {
                throw result.error;
            }

            window.location.replace("../index.html");

        } catch (error) {
            console.error("NITRIXA: Logout failed:", error);

            buttons.forEach((button) => {
                button.disabled = false;
            });

            showMessage(
                "Logout failed. Please try again.",
                "error"
            );
        }
    }

    function initializeLogout() {
        [
            "internLogoutButton",
            "dropdownLogoutButton"
        ].forEach((id) => {
            const button = $(id);

            if (button) {
                button.addEventListener("click", logout);
            }
        });
    }

    async function initializeInternProfile() {
        if (initializationStarted) return;

        initializationStarted = true;

        hideElement("profileErrorState");
        hideElement("profilePageContent");
        showElement("profileLoadingState");

        initializeSidebar();
        initializeUserDropdown();
        initializeLogout();

        const retryButton = $("profileRetryButton");

        if (retryButton) {
            retryButton.addEventListener("click", () => {
                window.location.reload();
            });
        }

        try {
            if (!window.supabaseClient?.auth) {
                throw new Error(
                    "Supabase client is unavailable. Check the CDN, script paths and browser console."
                );
            }

            const sessionResult = await withTimeout(
                window.supabaseClient.auth.getSession(),
                "Authentication check"
            );

            if (sessionResult.error) {
                throw sessionResult.error;
            }

            const session = sessionResult.data?.session;

            if (!session?.user) {
                window.location.replace("../login.html");
                return;
            }

            currentUser = session.user;
            currentIntern = null;

            updateIdentity();

            hideElement("profileLoadingState");
            hideElement("profileErrorState");
            showElement("profilePageContent");

            initializeProfileForm();

            setText(
                "profileOnboardingStatus",
                "Account active"
            );

            setText(
                "profileOnboardingDescription",
                "Your account is active. Checking your intern record..."
            );

            currentIntern = await loadInternRecord(currentUser.id);

            updateIdentity();

            setText(
                "profileOnboardingStatus",
                currentIntern?.status || "Account active"
            );

            setText(
                "profileOnboardingDescription",
                currentIntern
                    ? "Your account and intern record have been identified."
                    : "Your account is active. An Intern ID may be assigned after enrollment."
            );

            /*
             * Do not calculate or update completion here.
             * The percentage changes only after form submission.
             */

        } catch (error) {
            console.error(
                "NITRIXA: Profile initialization error:",
                error
            );

            showError(
                error.message ||
                "We could not initialize your profile. Please try again."
            );
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        initializeInternProfile().catch((error) => {
            console.error(
                "NITRIXA: Unexpected profile error:",
                error
            );

            showError(
                "An unexpected error occurred while loading your profile."
            );
        });
    });

})();
