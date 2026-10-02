/* =========================================================
   NITRIXA TECHNOLOGIES
   INTERN DASHBOARD
   File: js/intern-dashboard.js
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       GLOBAL STATE
       ===================================================== */

    let currentUser = null;
    let currentIntern = null;
    let currentEnrollment = null;
    let currentProgram = null;
    let currentBatch = null;
    let currentPayment = null;

    let dashboardInitialized = false;


    /* =====================================================
       CONSTANTS
       ===================================================== */

    const UNLOCKED_ENROLLMENT_STATUSES = [
        "ACTIVE",
        "PAYMENT_VERIFIED",
        "COMPLETED"
    ];

    const LOCKED_ENROLLMENT_STATUSES = [
        "PENDING_PAYMENT",
        "CANCELLED"
    ];

    const MODULE_LINK_SELECTORS = [
        ".intern-nav-link[data-enrollment-required]",
        ".intern-quick-card[data-enrollment-required]"
    ].join(", ");


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    function showElement(element) {
        if (!element) return;

        element.hidden = false;
        element.style.display = "";
    }


    function hideElement(element) {
        if (!element) return;

        element.hidden = true;
        element.style.display = "none";
    }


    function setText(id, value, fallback = "—") {
        const element = getElement(id);

        if (!element) return;

        const finalValue =
            value === null ||
            value === undefined ||
            String(value).trim() === ""
                ? fallback
                : String(value);

        element.textContent = finalValue;
    }


    function normalizeText(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();
    }


    /* =====================================================
       NAME HELPERS
       ===================================================== */

    function getUserDisplayName(user) {
        if (!user) {
            return "Intern";
        }

        const metadata =
            user.user_metadata || {};

        const possibleNames = [
            metadata.full_name,
            metadata.fullName,
            metadata.name,
            metadata.display_name,
            metadata.displayName
        ];

        for (const name of possibleNames) {
            if (
                name &&
                String(name).trim()
            ) {
                return String(name).trim();
            }
        }

        if (user.email) {
            const emailName =
                String(user.email)
                    .split("@")[0]
                    .replace(/[._-]+/g, " ")
                    .trim();

            if (emailName) {
                return emailName
                    .split(" ")
                    .map(function (part) {
                        if (!part) return "";

                        return (
                            part.charAt(0).toUpperCase() +
                            part.slice(1)
                        );
                    })
                    .join(" ");
            }
        }

        return "Intern";
    }


    function getInitials(name) {
        const cleanName =
            normalizeText(name);

        if (!cleanName) {
            return "N";
        }

        const parts =
            cleanName
                .split(/\s+/)
                .filter(Boolean);

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }


    /* =====================================================
       FORMATTERS
       ===================================================== */

    function formatEnrollmentPath(path) {
        const value =
            normalizeText(path).toLowerCase();

        if (value === "internship") {
            return "Internship Only";
        }

        if (
            value === "training-internship" ||
            value === "training_and_internship"
        ) {
            return "Training + Internship";
        }

        return path || "—";
    }


    function formatProgramType(type) {
        const value =
            normalizeText(type).toUpperCase();

        if (value === "INTERNSHIP") {
            return "Internship";
        }

        if (
            value === "TRAINING_AND_INTERNSHIP"
        ) {
            return "Training + Internship";
        }

        if (value === "TRAINING") {
            return "Training";
        }

        return type || "—";
    }


    function formatEnrollmentStatus(status) {
        const value =
            normalizeText(status)
                .toUpperCase();

        switch (value) {
            case "ACTIVE":
                return "Active";

            case "PAYMENT_VERIFIED":
                return "Payment Verified";

            case "PENDING_PAYMENT":
                return "Pending Payment";

            case "COMPLETED":
                return "Completed";

            case "CANCELLED":
                return "Cancelled";

            default:
                return status || "—";
        }
    }


    function formatPaymentStatus(status) {
        const value =
            normalizeText(status)
                .toUpperCase();

        switch (value) {
            case "SUCCESS":
                return "Verified";

            case "CREATED":
                return "Created";

            case "PENDING":
                return "Pending";

            case "FAILED":
                return "Failed";

            case "REFUNDED":
                return "Refunded";

            default:
                return status || "—";
        }
    }


    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    function getProgramDuration(program) {
        if (!program) {
            return "—";
        }

        const programType =
            normalizeText(
                program.program_type
            ).toUpperCase();

        const trainingDuration =
            normalizeText(
                program.training_duration
            );

        const internshipDuration =
            normalizeText(
                program.internship_duration
            );

        if (
            programType ===
            "TRAINING_AND_INTERNSHIP"
        ) {
            if (
                trainingDuration &&
                internshipDuration
            ) {
                return (
                    trainingDuration +
                    " Training + " +
                    internshipDuration +
                    " Internship"
                );
            }

            if (internshipDuration) {
                return internshipDuration;
            }

            if (trainingDuration) {
                return trainingDuration;
            }
        }

        if (internshipDuration) {
            return internshipDuration;
        }

        if (program.duration) {
            return program.duration;
        }

        return "—";
    }


    /* =====================================================
       ENROLLMENT ACCESS STATE
       ===================================================== */

    function hasActiveEnrollment() {
        if (!currentEnrollment) {
            return false;
        }

        const status =
            normalizeText(
                currentEnrollment.status
            ).toUpperCase();

        return UNLOCKED_ENROLLMENT_STATUSES.includes(
            status
        );
    }


    function isEnrollmentLocked() {
        /*
         * No enrollment = locked.
         *
         * Pending payment / cancelled = locked.
         *
         * Active / payment verified / completed =
         * unlocked.
         */
        return !hasActiveEnrollment();
    }


    /* =====================================================
       CHOOSE PROGRAM CARD
       ===================================================== */

    function updateChooseProgramCard() {
        const card =
            getElement(
                "dashboardChooseProgramCard"
            );

        if (!card) {
            return;
        }

        /*
         * Registered user without an active enrollment:
         * show the choose-program card.
         */
        if (!hasActiveEnrollment()) {
            showElement(card);

            setText(
                "dashboardChooseProgramTitle",
                "Choose your program",
                "Choose your program"
            );

            return;
        }

        /*
         * Enrolled user:
         * hide the card.
         */
        hideElement(card);
    }


    /* =====================================================
       LOCK / UNLOCK DASHBOARD MODULES
       ===================================================== */

    function setModuleLockedState(link, locked) {
        if (!link) {
            return;
        }

        if (locked) {
            link.classList.add(
                "is-locked"
            );

            link.setAttribute(
                "aria-disabled",
                "true"
            );

            link.setAttribute(
                "data-locked",
                "true"
            );

            /*
             * Keep the original href intact.
             * JavaScript intercepts the click while locked.
             */
            link.setAttribute(
                "title",
                "Enroll in a program to unlock this module."
            );
        } else {
            link.classList.remove(
                "is-locked"
            );

            link.removeAttribute(
                "aria-disabled"
            );

            link.removeAttribute(
                "data-locked"
            );

            link.removeAttribute(
                "title"
            );
        }
    }


    function updateModuleAccess() {
        const locked =
            isEnrollmentLocked();

        const moduleLinks =
            document.querySelectorAll(
                MODULE_LINK_SELECTORS
            );

        moduleLinks.forEach(
            function (link) {
                setModuleLockedState(
                    link,
                    locked
                );
            }
        );
    }


    function initializeModuleAccess() {
        /*
         * Event delegation allows this to work even if
         * module cards/links are rendered later.
         */
        document.addEventListener(
            "click",
            function (event) {
                const link =
                    event.target.closest(
                        MODULE_LINK_SELECTORS
                    );

                if (!link) {
                    return;
                }

                if (
                    !isEnrollmentLocked()
                ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                /*
                 * No enrollment:
                 * send the user to the public Programs page.
                 */
                window.location.href =
                    "programs.html";
            }
        );
    }


    /* =====================================================
       UI STATE
       ===================================================== */

    function showLoadingState() {
        const loading =
            getElement(
                "dashboardLoadingState"
            );

        const error =
            getElement(
                "dashboardErrorState"
            );

        const content =
            getElement(
                "dashboardContent"
            );

        showElement(loading);
        hideElement(error);
        hideElement(content);
    }


    function showDashboard() {
        const loading =
            getElement(
                "dashboardLoadingState"
            );

        const error =
            getElement(
                "dashboardErrorState"
            );

        const content =
            getElement(
                "dashboardContent"
            );

        hideElement(loading);
        hideElement(error);
        showElement(content);
    }


    function showDashboardError(message) {
        const loading =
            getElement(
                "dashboardLoadingState"
            );

        const error =
            getElement(
                "dashboardErrorState"
            );

        const content =
            getElement(
                "dashboardContent"
            );

        hideElement(loading);
        hideElement(content);
        showElement(error);

        setText(
            "dashboardErrorMessage",
            message ||
                "We could not load your dashboard."
        );
    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function getCurrentSession() {
        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        const {
            data,
            error
        } =
            await window.supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        return data
            ? data.session
            : null;
    }


    async function requireAuthenticatedUser() {
        const session =
            await getCurrentSession();

        if (
            !session ||
            !session.user
        ) {
            redirectToLogin();
            return null;
        }

        currentUser =
            session.user;

        return currentUser;
    }


    function redirectToLogin() {
        window.location.href =
            "login.html";
    }


    /* =====================================================
       DATABASE — INTERN
       IMPORTANT:
       Intern record is OPTIONAL.
       Dashboard access does NOT depend on Intern ID.
       ===================================================== */

    async function loadInternRecord(userId) {
        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("interns")
                .select(
                    `
                    id,
                    user_id,
                    enrollment_id,
                    intern_id,
                    status,
                    created_at,
                    updated_at
                    `
                )
                .eq(
                    "user_id",
                    userId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }


    /* =====================================================
       DATABASE — ENROLLMENT
       ===================================================== */

    async function loadEnrollment(
        enrollmentId,
        userId
    ) {
        let query =
            window.supabaseClient
                .from("enrollments")
                .select(
                    `
                    id,
                    user_id,
                    program_id,
                    batch_id,
                    enrollment_path,
                    status,
                    amount,
                    created_at,
                    updated_at
                    `
                );

        if (enrollmentId) {
            query =
                query.eq(
                    "id",
                    enrollmentId
                );
        } else {
            query =
                query
                    .eq(
                        "user_id",
                        userId
                    )
                    .in(
                        "status",
                        [
                            "ACTIVE",
                            "PAYMENT_VERIFIED",
                            "COMPLETED"
                        ]
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1);
        }

        if (enrollmentId) {
            const {
                data,
                error
            } = await query.maybeSingle();

            if (error) {
                throw error;
            }

            return data;
        }

        const {
            data,
            error
        } = await query;

        if (error) {
            throw error;
        }

        return data &&
            data.length
            ? data[0]
            : null;
    }


    /* =====================================================
       DATABASE — PROGRAM
       ===================================================== */

    async function loadProgram(programId) {
        if (!programId) {
            return null;
        }

        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("programs")
                .select(
                    `
                    id,
                    name,
                    slug,
                    description,
                    program_type,
                    duration,
                    internship_duration,
                    training_duration,
                    payment_model,
                    fee,
                    status
                    `
                )
                .eq(
                    "id",
                    programId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }


    /* =====================================================
       DATABASE — BATCH
       ===================================================== */

    async function loadBatch(batchId) {
        if (!batchId) {
            return null;
        }

        try {
            const {
                data,
                error
            } =
                await window.supabaseClient
                    .from("batches")
                    .select(
                        `
                        id,
                        name,
                        batch_name,
                        start_date,
                        end_date,
                        status
                        `
                    )
                    .eq(
                        "id",
                        batchId
                    )
                    .maybeSingle();

            if (error) {
                console.warn(
                    "NITRIXA: Batch could not be loaded.",
                    error
                );

                return null;
            }

            return data;
        } catch (error) {
            console.warn(
                "NITRIXA: Batch lookup failed.",
                error
            );

            return null;
        }
    }


    /* =====================================================
       DATABASE — PAYMENT
       ===================================================== */

    async function loadPayment(
        enrollmentId,
        userId
    ) {
        if (!enrollmentId) {
            return null;
        }

        try {
            const {
                data,
                error
            } =
                await window.supabaseClient
                    .from("payments")
                    .select(
                        `
                        id,
                        enrollment_id,
                        user_id,
                        amount,
                        currency,
                        gateway,
                        gateway_order_id,
                        gateway_payment_id,
                        status,
                        payment_method,
                        paid_at,
                        created_at
                        `
                    )
                    .eq(
                        "enrollment_id",
                        enrollmentId
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1);

            if (error) {
                console.warn(
                    "NITRIXA: Payment record could not be loaded.",
                    error
                );

                return null;
            }

            return data &&
                data.length
                ? data[0]
                : null;
        } catch (error) {
            console.warn(
                "NITRIXA: Payment lookup failed.",
                error
            );

            return null;
        }
    }


    /* =====================================================
       LOAD ALL DASHBOARD DATA
       ===================================================== */

    async function loadDashboardData() {
        if (!currentUser) {
            throw new Error(
                "Authenticated user is required."
            );
        }

        /*
         * Registration creates the account only.
         *
         * Registration does NOT create:
         * - enrollment
         * - payment
         * - Intern ID
         */

        currentIntern =
            await loadInternRecord(
                currentUser.id
            );

        /*
         * If an Intern ID exists, use its enrollment.
         *
         * If there is no Intern record, search for the
         * latest active/payment-verified/completed enrollment.
         */

        let enrollmentId =
            currentIntern &&
            currentIntern.enrollment_id
                ? currentIntern.enrollment_id
                : null;

        currentEnrollment =
            await loadEnrollment(
                enrollmentId,
                currentUser.id
            );

        /*
         * Registered user with no enrollment is a
         * completely valid dashboard state.
         */

        if (!currentEnrollment) {
            currentProgram = null;
            currentBatch = null;
            currentPayment = null;

            return {
                user: currentUser,
                intern: currentIntern,
                enrollment: null,
                program: null,
                batch: null,
                payment: null
            };
        }

        currentProgram =
            await loadProgram(
                currentEnrollment.program_id
            );

        /*
         * If the enrollment exists but the program is
         * temporarily unavailable, do not block dashboard.
         */

        if (!currentProgram) {
            console.warn(
                "NITRIXA: Enrolled program could not be loaded.",
                currentEnrollment.program_id
            );
        }

        currentBatch =
            await loadBatch(
                currentEnrollment.batch_id
            );

        currentPayment =
            await loadPayment(
                currentEnrollment.id,
                currentUser.id
            );

        return {
            user: currentUser,
            intern: currentIntern,
            enrollment: currentEnrollment,
            program: currentProgram,
            batch: currentBatch,
            payment: currentPayment
        };
    }


    /* =====================================================
       UPDATE PROFILE / HEADER
       ===================================================== */

    function updateUserIdentity() {
        const name =
            getUserDisplayName(
                currentUser
            );

        const initials =
            getInitials(name);

        setText(
            "sidebarInternName",
            name,
            "Intern"
        );

        setText(
            "sidebarInternId",
            currentIntern &&
            currentIntern.intern_id
                ? currentIntern.intern_id
                : "Registered User"
        );

        setText(
            "topUserName",
            name,
            "Intern"
        );

        setText(
            "welcomeInternName",
            name,
            "Intern"
        );

        setText(
            "welcomeInternId",
            currentIntern &&
            currentIntern.intern_id
                ? currentIntern.intern_id
                : "Not enrolled"
        );

        setText(
            "internCurrentYear",
            new Date().getFullYear(),
            "2026"
        );

        const avatarIds = [
            "sidebarAvatar",
            "topAvatar"
        ];

        avatarIds.forEach(function (id) {
            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    initials;
            }
        });
    }


    /* =====================================================
       UPDATE STATUS CARDS
       ===================================================== */

    function updateStatusCards() {
        /*
         * No enrollment.
         */

        if (!currentEnrollment) {
            setText(
                "dashboardProgramName",
                "Not enrolled"
            );

            setText(
                "dashboardProgramType",
                "Choose a program"
            );

            setText(
                "dashboardEnrollmentStatus",
                "Not enrolled"
            );

            setText(
                "dashboardEnrollmentPath",
                "—"
            );

            setText(
                "dashboardPaymentStatus",
                "Not required yet"
            );

            updateProgress(0);

            return;
        }


        const programName =
            currentProgram &&
            currentProgram.name
                ? currentProgram.name
                : "—";

        const programType =
            currentProgram
                ? formatProgramType(
                    currentProgram.program_type
                )
                : "—";

        const enrollmentStatus =
            formatEnrollmentStatus(
                currentEnrollment.status
            );

        const enrollmentPath =
            formatEnrollmentPath(
                currentEnrollment.enrollment_path
            );

        let paymentStatus =
            "Pending";

        if (currentPayment) {
            paymentStatus =
                formatPaymentStatus(
                    currentPayment.status
                );
        } else if (
            currentEnrollment &&
            (
                currentEnrollment.status ===
                    "ACTIVE" ||
                currentEnrollment.status ===
                    "PAYMENT_VERIFIED"
            )
        ) {
            paymentStatus =
                "Verified";
        }

        setText(
            "dashboardProgramName",
            programName
        );

        setText(
            "dashboardProgramType",
            programType
        );

        setText(
            "dashboardEnrollmentStatus",
            enrollmentStatus
        );

        setText(
            "dashboardEnrollmentPath",
            enrollmentPath
        );

        setText(
            "dashboardPaymentStatus",
            paymentStatus
        );

        updateProgress(0);
    }


    /* =====================================================
       UPDATE INTERNSHIP OVERVIEW
       ===================================================== */

    function updateInternshipOverview() {
        /*
         * No enrollment yet.
         */

        if (!currentEnrollment) {
            setText(
                "overviewProgramName",
                "No program selected"
            );

            setText(
                "overviewProgramDuration",
                "Choose a program to begin"
            );

            setText(
                "overviewEnrollmentPath",
                "Not enrolled"
            );

            setText(
                "overviewEnrollmentDate",
                "—"
            );

            setText(
                "overviewBatch",
                "Not assigned"
            );

            updateStatusBadge(
                "NOT_ENROLLED"
            );

            return;
        }


        const programName =
            currentProgram &&
            currentProgram.name
                ? currentProgram.name
                : "—";

        const duration =
            getProgramDuration(
                currentProgram
            );

        const enrollmentPath =
            formatEnrollmentPath(
                currentEnrollment.enrollment_path
            );

        const enrollmentDate =
            formatDate(
                currentEnrollment.created_at
            );

        let batchName =
            "Not assigned";

        if (currentBatch) {
            batchName =
                currentBatch.name ||
                currentBatch.batch_name ||
                "Assigned";
        }

        const status =
            normalizeText(
                currentEnrollment.status
            ).toUpperCase();

        setText(
            "overviewProgramName",
            programName
        );

        setText(
            "overviewProgramDuration",
            duration
        );

        setText(
            "overviewEnrollmentPath",
            enrollmentPath
        );

        setText(
            "overviewEnrollmentDate",
            enrollmentDate
        );

        setText(
            "overviewBatch",
            batchName,
            "Not assigned"
        );

        updateStatusBadge(status);
    }


    /* =====================================================
       STATUS BADGE
       ===================================================== */

    function updateStatusBadge(status) {
        const badge =
            getElement(
                "internshipStatusBadge"
            );

        if (!badge) {
            return;
        }

        const normalized =
            normalizeText(status)
                .toUpperCase();

        let label = "ACTIVE";

        if (
            normalized ===
            "NOT_ENROLLED"
        ) {
            label = "NOT ENROLLED";
        } else if (
            normalized ===
            "COMPLETED"
        ) {
            label = "COMPLETED";
        } else if (
            normalized ===
            "PAYMENT_VERIFIED"
        ) {
            label = "VERIFIED";
        } else if (
            normalized ===
            "PENDING_PAYMENT"
        ) {
            label = "PAYMENT PENDING";
        } else if (
            normalized ===
            "CANCELLED"
        ) {
            label = "CANCELLED";
        } else if (
            normalized ===
            "SUSPENDED"
        ) {
            label = "SUSPENDED";
        }

        badge.textContent =
            label;

        badge.classList.remove(
            "active",
            "completed",
            "warning",
            "danger"
        );

        if (
            normalized ===
            "NOT_ENROLLED"
        ) {
            badge.classList.add(
                "warning"
            );
        } else if (
            normalized ===
            "COMPLETED"
        ) {
            badge.classList.add(
                "completed"
            );
        } else if (
            normalized ===
                "SUSPENDED" ||
            normalized ===
                "PAYMENT_VERIFIED" ||
            normalized ===
                "PENDING_PAYMENT"
        ) {
            badge.classList.add(
                "warning"
            );
        } else if (
            normalized ===
            "CANCELLED"
        ) {
            badge.classList.add(
                "danger"
            );
        } else {
            badge.classList.add(
                "active"
            );
        }
    }


    /* =====================================================
       PROGRESS
       ===================================================== */

    function updateProgress(value) {
        let progress =
            Number(value);

        if (
            !Number.isFinite(progress)
        ) {
            progress = 0;
        }

        progress =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(progress)
                )
            );

        setText(
            "dashboardProgressValue",
            progress + "%"
        );

        setText(
            "progressCircleValue",
            progress + "%"
        );

        const circle =
            getElement(
                "progressCircle"
            );

        if (circle) {
            circle.style.setProperty(
                "--progress",
                progress + "%"
            );

            circle.style.background =
                "conic-gradient(" +
                "#3157d5 " +
                progress +
                "%, #edf0f6 " +
                progress +
                "%)";
        }
    }


    /* =====================================================
       FUTURE MODULE PLACEHOLDERS
       ===================================================== */

    function initializeFutureModuleStates() {
        /*
         * Live Classes, Tasks, Projects,
         * Milestones, Evaluation and Certificate
         * will connect to their respective DB modules
         * as those modules are implemented.
         */

        const liveBadge =
            getElement(
                "liveClassBadge"
            );

        const taskBadge =
            getElement(
                "taskBadge"
            );

        if (liveBadge) {
            liveBadge.hidden = true;
            liveBadge.textContent = "0";
        }

        if (taskBadge) {
            taskBadge.hidden = true;
            taskBadge.textContent = "0";
        }
    }


    /* =====================================================
       SIDEBAR
       ===================================================== */

    function openSidebar() {
        const sidebar =
            getElement(
                "internSidebar"
            );

        const overlay =
            getElement(
                "internSidebarOverlay"
            );

        const toggle =
            getElement(
                "internSidebarToggle"
            );

        if (sidebar) {
            sidebar.classList.add(
                "is-open"
            );
        }

        if (overlay) {
            overlay.classList.add(
                "is-visible"
            );

            overlay.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        if (toggle) {
            toggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        document.body.classList.add(
            "intern-sidebar-open"
        );
    }


    function closeSidebar() {
        const sidebar =
            getElement(
                "internSidebar"
            );

        const overlay =
            getElement(
                "internSidebarOverlay"
            );

        const toggle =
            getElement(
                "internSidebarToggle"
            );

        if (sidebar) {
            sidebar.classList.remove(
                "is-open"
            );
        }

        if (overlay) {
            overlay.classList.remove(
                "is-visible"
            );

            overlay.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        if (toggle) {
            toggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        document.body.classList.remove(
            "intern-sidebar-open"
        );
    }


    function initializeSidebar() {
        const toggle =
            getElement(
                "internSidebarToggle"
            );

        const close =
            getElement(
                "internSidebarClose"
            );

        const overlay =
            getElement(
                "internSidebarOverlay"
            );

        if (toggle) {
            toggle.addEventListener(
                "click",
                function () {
                    const sidebar =
                        getElement(
                            "internSidebar"
                        );

                    if (
                        sidebar &&
                        sidebar.classList.contains(
                            "is-open"
                        )
                    ) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }
                }
            );
        }

        if (close) {
            close.addEventListener(
                "click",
                closeSidebar
            );
        }

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeSidebar
            );
        }

        document
            .querySelectorAll(
                ".intern-nav-link"
            )
            .forEach(function (link) {
                link.addEventListener(
                    "click",
                    function () {
                        if (
                            window.innerWidth <=
                            980
                        ) {
                            closeSidebar();
                        }
                    }
                );
            });

        window.addEventListener(
            "resize",
            function () {
                if (
                    window.innerWidth >
                    980
                ) {
                    closeSidebar();
                }
            }
        );
    }


    /* =====================================================
       USER DROPDOWN
       ===================================================== */

    function openUserDropdown() {
        const dropdown =
            getElement(
                "userDropdown"
            );

        const button =
            getElement(
                "userMenuButton"
            );

        if (!dropdown) {
            return;
        }

        dropdown.hidden = false;

        window.requestAnimationFrame(
            function () {
                dropdown.classList.add(
                    "is-open"
                );
            }
        );

        if (button) {
            button.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }


    function closeUserDropdown() {
        const dropdown =
            getElement(
                "userDropdown"
            );

        const button =
            getElement(
                "userMenuButton"
            );

        if (!dropdown) {
            return;
        }

        dropdown.classList.remove(
            "is-open"
        );

        dropdown.hidden = true;

        if (button) {
            button.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }


    function toggleUserDropdown() {
        const dropdown =
            getElement(
                "userDropdown"
            );

        if (!dropdown) {
            return;
        }

        if (
            dropdown.hidden ||
            !dropdown.classList.contains(
                "is-open"
            )
        ) {
            openUserDropdown();
        } else {
            closeUserDropdown();
        }
    }


    function initializeUserMenu() {
        const button =
            getElement(
                "userMenuButton"
            );

        if (button) {
            button.addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    toggleUserDropdown();
                }
            );
        }

        document.addEventListener(
            "click",
            function (event) {
                const dropdown =
                    getElement(
                        "userDropdown"
                    );

                const menuButton =
                    getElement(
                        "userMenuButton"
                    );

                if (
                    !dropdown ||
                    !menuButton
                ) {
                    return;
                }

                if (
                    !dropdown.contains(
                        event.target
                    ) &&
                    !menuButton.contains(
                        event.target
                    )
                ) {
                    closeUserDropdown();
                }
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logoutUser() {
        try {
            const logoutButtons =
                [
                    getElement(
                        "internLogoutButton"
                    ),
                    getElement(
                        "dropdownLogoutButton"
                    )
                ];

            logoutButtons.forEach(
                function (button) {
                    if (button) {
                        button.disabled = true;
                    }
                }
            );

            if (
                window.supabaseClient &&
                window.supabaseClient.auth
            ) {
                const {
                    error
                } =
                    await window.supabaseClient
                        .auth
                        .signOut({
                            scope: "local"
                        });

                if (error) {
                    throw error;
                }
            }

            window.location.href =
                "index.html";

        } catch (error) {
            console.error(
                "NITRIXA: Logout failed.",
                error
            );

            alert(
                "Logout failed. Please try again."
            );

            const logoutButtons =
                [
                    getElement(
                        "internLogoutButton"
                    ),
                    getElement(
                        "dropdownLogoutButton"
                    )
                ];

            logoutButtons.forEach(
                function (button) {
                    if (button) {
                        button.disabled = false;
                    }
                }
            );
        }
    }


    function initializeLogout() {
        const sidebarLogout =
            getElement(
                "internLogoutButton"
            );

        const dropdownLogout =
            getElement(
                "dropdownLogoutButton"
            );

        if (sidebarLogout) {
            sidebarLogout.addEventListener(
                "click",
                logoutUser
            );
        }

        if (dropdownLogout) {
            dropdownLogout.addEventListener(
                "click",
                logoutUser
            );
        }
    }


    /* =====================================================
       RETRY
       ===================================================== */

    function initializeRetry() {
        const retryButton =
            getElement(
                "dashboardRetryButton"
            );

        if (!retryButton) {
            return;
        }

        retryButton.addEventListener(
            "click",
            async function () {
                await initializeDashboard();
            }
        );
    }


    /* =====================================================
       NOTIFICATION BUTTON
       ===================================================== */

    function initializeNotifications() {
        const button =
            getElement(
                "notificationButton"
            );

        if (!button) {
            return;
        }

        button.addEventListener(
            "click",
            function () {
                console.log(
                    "NITRIXA: Notifications module is not active yet."
                );
            }
        );
    }


    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    function initializeAuthListener() {
        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {
            return;
        }

        window.supabaseClient.auth.onAuthStateChange(
            function (event, session) {

                if (
                    event ===
                    "SIGNED_OUT"
                ) {
                    window.location.href =
                        "index.html";

                    return;
                }

                if (
                    !session &&
                    event !==
                    "INITIAL_SESSION"
                ) {
                    window.location.href =
                        "login.html";
                }
            }
        );
    }


    /* =====================================================
       MAIN INITIALIZATION
       ===================================================== */

    async function initializeDashboard() {
        if (
            !window.supabaseClient
        ) {
            showDashboardError(
                "Supabase could not be initialized. Please refresh the page and try again."
            );

            return;
        }

        showLoadingState();

        try {
            const user =
                await requireAuthenticatedUser();

            if (!user) {
                return;
            }

            await loadDashboardData();

            updateUserIdentity();

            updateStatusCards();

            updateInternshipOverview();

            /*
             * NEW:
             * Show/hide Choose Program card.
             */
            updateChooseProgramCard();

            /*
             * NEW:
             * Lock/unlock dashboard modules based on
             * enrollment state.
             */
            updateModuleAccess();

            initializeFutureModuleStates();

            showDashboard();

            dashboardInitialized = true;

            console.log(
                "NITRIXA: Intern dashboard loaded successfully.",
                {
                    userId:
                        currentUser.id,

                    internId:
                        currentIntern &&
                        currentIntern.intern_id
                            ? currentIntern.intern_id
                            : null,

                    enrollmentId:
                        currentEnrollment &&
                        currentEnrollment.id
                            ? currentEnrollment.id
                            : null,

                    enrollmentStatus:
                        currentEnrollment &&
                        currentEnrollment.status
                            ? currentEnrollment.status
                            : null,

                    programId:
                        currentProgram &&
                        currentProgram.id
                            ? currentProgram.id
                            : null,

                    moduleAccess:
                        hasActiveEnrollment()
                            ? "UNLOCKED"
                            : "LOCKED"
                }
            );

        } catch (error) {
            console.error(
                "NITRIXA: Dashboard initialization failed.",
                error
            );

            let message =
                "We could not load your dashboard. Please try again.";

            if (
                error &&
                error.message
            ) {
                message =
                    error.message;
            }

            showDashboardError(
                message
            );
        }
    }


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        async function () {

            initializeSidebar();

            initializeUserMenu();

            initializeLogout();

            initializeRetry();

            initializeNotifications();

            initializeModuleAccess();

            initializeAuthListener();

            await initializeDashboard();
        }
    );


    /* =====================================================
       OPTIONAL GLOBAL ACCESS
       ===================================================== */

    window.NitrixaInternDashboard = {

        reload:
            initializeDashboard,

        logout:
            logoutUser,

        isInitialized:
            function () {
                return dashboardInitialized;
            },

        hasActiveEnrollment:
            function () {
                return hasActiveEnrollment();
            }
    };

})();