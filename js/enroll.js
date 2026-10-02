/* =========================================================
   NITRIXA TECHNOLOGIES
   PUBLIC ENROLLMENT
   PROGRAM + AUTHENTICATION GATE

   FLOW:
   Programs
      ↓
   Enrollment
      ↓
   Authentication
      ↓
   Enrollment Path
      ↓
   Payment

   BUSINESS RULES:
   - Registration alone does NOT create an internship.
   - Existing Intern ID users may access dashboard from login.
   - Internship programs → Internship Only.
   - Training + Internship programs →
     Training + Internship ONLY.
   - Training + Internship requires training completion
     + Master Admin approval before internship unlock.
   - Payment verification is handled separately.
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const loadingElement =
        document.getElementById("enrollLoading");

    const errorElement =
        document.getElementById("enrollError");

    const errorMessageElement =
        document.getElementById("enrollErrorMessage");

    const appElement =
        document.getElementById("enrollApp");

    const authGate =
        document.getElementById("enrollmentAuthGate");

    const loginButton =
        document.getElementById("enrollmentLoginButton");

    const accountStatus =
        document.getElementById("enrollmentAccountStatus");

    const pathSection =
        document.getElementById("enrollmentPathSection");

    const pathGrid =
        document.getElementById("pathGrid");


    /* =====================================================
       STATE
       ===================================================== */

    let selectedProgram = null;
    let currentUser = null;


    /* =====================================================
       VISIBILITY HELPERS
       ===================================================== */

    function show(element) {

        if (!element) {
            return;
        }

        element.classList.remove("is-hidden");
        element.hidden = false;

    }


    function hide(element) {

        if (!element) {
            return;
        }

        element.classList.add("is-hidden");
        element.hidden = true;

    }


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    function resetStates() {

        show(loadingElement);

        hide(errorElement);
        hide(appElement);
        hide(accountStatus);
        hide(pathSection);
        hide(authGate);

    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    /* =====================================================
       FORMAT PROGRAM TYPE
       ===================================================== */

    function formatType(value) {

        const normalized =
            String(value || "")
                .trim()
                .toUpperCase();

        const map = {

            INTERNSHIP:
                "Internship",

            TRAINING:
                "Training",

            TRAINING_AND_INTERNSHIP:
                "Training + Internship"

        };

        if (map[normalized]) {
            return map[normalized];
        }

        return String(value || "Program")
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(
                /\b\w/g,
                letter => letter.toUpperCase()
            );

    }


    /* =====================================================
       FORMAT LEVEL
       ===================================================== */

    function formatLevel(value) {

        if (!value) {
            return "All Levels";
        }

        return String(value)
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(
                /\b\w/g,
                letter => letter.toUpperCase()
            );

    }


    /* =====================================================
       TECHNOLOGIES
       ===================================================== */

    function technologies(value) {

        if (Array.isArray(value)) {

            return value
                .map(String)
                .map(item => item.trim())
                .filter(Boolean);

        }

        if (typeof value === "string") {

            return value
                .split(",")
                .map(item => item.trim())
                .filter(Boolean);

        }

        return [];

    }


    /* =====================================================
       PAYMENT TEXT
       ===================================================== */

    function paymentText(program) {

        const type =
            String(program?.program_type || "")
                .trim()
                .toUpperCase();

        /*
         * Training + Internship:
         * One combined payment.
         */

        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return (
                "Full payment during enrollment. " +
                "No separate internship payment."
            );

        }


        /*
         * Internship:
         * Full payment OR 3-month installment
         * depending on program configuration.
         */

        if (
            program?.payment_model ===
            "FULL_AND_INSTALLMENT"
        ) {

            return (
                "Full payment or 3-month installment."
            );

        }


        return (
            "Full payment during enrollment."
        );

    }


    /* =====================================================
       DURATION
       ===================================================== */

    function durationText(program) {

        const type =
            String(program?.program_type || "")
                .trim()
                .toUpperCase();


        /*
         * Training + Internship
         */

        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return (
                `Training: ${
                    program.training_duration ||
                    "—"
                } • Internship: ${
                    program.internship_duration ||
                    "—"
                }`
            );

        }


        /*
         * Internship
         */

        return (
            program.internship_duration ||
            program.duration ||
            "—"
        );

    }


    /* =====================================================
       PROGRAM SLUG
       ===================================================== */

    function getSlug(program) {

        return String(
            program?.slug ||
            program?.id ||
            ""
        ).trim();

    }


    /* =====================================================
       PROGRAM TYPE
       ===================================================== */

    function getProgramType(program) {

        return String(
            program?.program_type || ""
        )
            .trim()
            .toUpperCase();

    }


    /* =====================================================
       ERROR
       ===================================================== */

    function showError(message) {

        hide(loadingElement);
        hide(appElement);
        hide(accountStatus);
        hide(pathSection);
        hide(authGate);

        if (errorMessageElement) {

            errorMessageElement.textContent =
                message ||
                "We could not load this program.";

        }

        show(errorElement);

    }


    /* =====================================================
       RENDER PROGRAM
       ===================================================== */

    function renderProgram(program) {

        const nameElement =
            document.getElementById("programName");

        const descriptionElement =
            document.getElementById("programDescription");

        const feeElement =
            document.getElementById("programFee");

        const paymentNoteElement =
            document.getElementById("programPaymentNote");

        const typeElement =
            document.getElementById("programType");

        const durationElement =
            document.getElementById("programDuration");

        const levelElement =
            document.getElementById("programLevel");

        const paymentModelElement =
            document.getElementById("programPaymentModel");

        const tagsElement =
            document.getElementById("programTags");


        if (nameElement) {

            nameElement.textContent =
                program.name ||
                "Program";

        }


        if (descriptionElement) {

            descriptionElement.textContent =
                program.description ||
                "A structured NITRIXA Technologies program focused on practical learning, projects and career development.";

        }


        if (feeElement) {

            const fee =
                Number(program.fee || 0);

            feeElement.textContent =
                `₹${fee.toLocaleString("en-IN")}`;

        }


        if (paymentNoteElement) {

            paymentNoteElement.textContent =
                paymentText(program);

        }


        if (typeElement) {

            typeElement.textContent =
                formatType(
                    program.program_type
                );

        }


        if (durationElement) {

            durationElement.textContent =
                durationText(program);

        }


        if (levelElement) {

            levelElement.textContent =
                formatLevel(program.level);

        }


        if (paymentModelElement) {

            const type =
                getProgramType(program);


            if (
                type ===
                "TRAINING_AND_INTERNSHIP"
            ) {

                paymentModelElement.textContent =
                    "Full payment";

            } else if (
                program.payment_model ===
                "FULL_AND_INSTALLMENT"
            ) {

                paymentModelElement.textContent =
                    "Full / 3-month installment";

            } else {

                paymentModelElement.textContent =
                    "Full payment";

            }

        }


        if (tagsElement) {

            const tags =
                technologies(
                    program.technologies
                ).slice(0, 8);


            tagsElement.innerHTML =
                tags.length
                    ? tags
                        .map(
                            tag =>
                                `<span>${escapeHtml(tag)}</span>`
                        )
                        .join("")
                    : `<span>Practical Technology</span>`;

        }

    }


    /* =====================================================
       LOGIN URL
       ===================================================== */

    function buildLoginUrl() {

        if (!selectedProgram) {
            return "login.html";
        }


        const loginUrl =
            new URL(
                "login.html",
                window.location.href
            );


        const slug =
            getSlug(selectedProgram);


        /*
         * Preserve selected program.
         */

        if (slug) {

            loginUrl.searchParams.set(
                "program",
                slug
            );

        }


        /*
         * After authentication:
         *
         * login.html
         *      ↓
         * enroll.html
         */

        loginUrl.searchParams.set(
            "redirect",
            "enroll.html"
        );


        /*
         * Backward compatibility with
         * existing login links.
         */

        loginUrl.searchParams.set(
            "return",
            "enroll"
        );


        /*
         * Preserve existing enrollment path
         * if one exists.
         */

        const currentParams =
            new URLSearchParams(
                window.location.search
            );


        const existingPath =
            currentParams.get("path");


        if (existingPath) {

            loginUrl.searchParams.set(
                "path",
                existingPath
            );

        }


        return loginUrl.href;

    }


    /* =====================================================
       AUTH UI
       ===================================================== */

    function updateAuthenticationUI() {

        if (!selectedProgram) {
            return;
        }


        /*
         * LOGGED IN
         */

        if (currentUser) {

            hide(authGate);

            show(accountStatus);
            show(pathSection);

            renderPaths(
                selectedProgram
            );

            return;

        }


        /*
         * LOGGED OUT
         */

        show(authGate);

        hide(accountStatus);
        hide(pathSection);


        if (loginButton) {

            loginButton.href =
                buildLoginUrl();

        }

    }


    /* =====================================================
       SESSION CHECK
       ===================================================== */

    async function checkAuthentication() {

        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {

            currentUser = null;

            return;

        }


        try {

            const {
                data,
                error
            } =
                await window.supabaseClient
                    .auth
                    .getSession();


            if (error) {

                console.error(
                    "NITRIXA: Session check failed:",
                    error
                );

                currentUser = null;

                return;

            }


            currentUser =
                data &&
                data.session
                    ? data.session.user
                    : null;

        } catch (error) {

            console.error(
                "NITRIXA: Authentication error:",
                error
            );

            currentUser = null;

        }

    }


    /* =====================================================
       RENDER ENROLLMENT PATHS
       ===================================================== */

    function renderPaths(program) {

        if (
            !program ||
            !pathGrid
        ) {

            return;

        }


        const slug =
            encodeURIComponent(
                getSlug(program)
            );


        const type =
            getProgramType(program);


        /* =================================================
           TRAINING + INTERNSHIP
           ================================================= */

        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            pathGrid.innerHTML = `

                <article class="path-card featured">

                    <div class="path-icon">
                        01
                    </div>

                    <h3>
                        Training + Internship
                    </h3>

                    <p>
                        Complete the structured training
                        stage first, then unlock the
                        internship after completion and
                        Master Admin approval.
                    </p>

                    <ul class="path-points">

                        <li>
                            Training access
                        </li>

                        <li>
                            Practical learning
                        </li>

                        <li>
                            Internship after completion
                        </li>

                        <li>
                            No separate internship payment
                        </li>

                    </ul>

                    <a
                        class="path-cta"
                        href="payment.html?program=${slug}&path=training-internship"
                    >
                        Enroll &amp; Continue to Payment

                        <span>
                            →
                        </span>

                    </a>

                </article>

            `;

            return;

        }


        /* =================================================
           INTERNSHIP ONLY
           ================================================= */

        if (
            type ===
            "INTERNSHIP"
        ) {

            pathGrid.innerHTML = `

                <article class="path-card featured">

                    <div class="path-icon">
                        01
                    </div>

                    <h3>
                        Internship Only
                    </h3>

                    <p>
                        Enter the direct internship pathway
                        focused on practical experience,
                        technical tasks and projects.
                    </p>

                    <ul class="path-points">

                        <li>
                            Structured internship
                        </li>

                        <li>
                            Practical project work
                        </li>

                        <li>
                            Duration:
                            ${escapeHtml(
                                program.internship_duration ||
                                program.duration ||
                                "—"
                            )}
                        </li>

                        <li>
                            ${escapeHtml(
                                paymentText(program)
                            )}
                        </li>

                    </ul>

                    <a
                        class="path-cta"
                        href="payment.html?program=${slug}&path=internship"
                    >
                        Enroll &amp; Continue to Payment

                        <span>
                            →
                        </span>

                    </a>

                </article>

            `;

            return;

        }


        /* =================================================
           LEGACY / UNSUPPORTED TRAINING
           ================================================= */

        pathGrid.innerHTML = `

            <article class="path-card featured">

                <div class="path-icon">
                    01
                </div>

                <h3>
                    Enrollment Unavailable
                </h3>

                <p>
                    This program does not currently have
                    a valid enrollment pathway.
                    Please return to Programs and select
                    an active program.
                </p>

                <a
                    class="path-cta"
                    href="programs.html"
                >
                    Back to Programs

                    <span>
                        →
                    </span>

                </a>

            </article>

        `;

    }


    /* =====================================================
       LOAD PROGRAM
       ===================================================== */

    async function loadProgram() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const slug =
            (
                params.get("program") || ""
            )
                .trim()
                .toLowerCase();


        if (!slug) {

            showError(
                "No program was selected. Please return to the Programs page and choose a program."
            );

            return false;

        }


        if (!window.supabaseClient) {

            showError(
                "Secure program connection is unavailable. Please refresh the page and try again."
            );

            return false;

        }


        try {

            const {
                data,
                error
            } =
                await window.supabaseClient

                    .from("programs")

                    .select(
                        [
                            "id",
                            "name",
                            "slug",
                            "category",
                            "description",
                            "level",
                            "program_type",
                            "duration",
                            "fee",
                            "technologies",
                            "status",
                            "training_duration",
                            "internship_duration",
                            "payment_model"
                        ].join(",")
                    )

                    .eq(
                        "status",
                        "ACTIVE"
                    )

                    .eq(
                        "slug",
                        slug
                    )

                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                showError(
                    "This program is no longer available or could not be found."
                );

                return false;

            }


            selectedProgram =
                data;


            renderProgram(data);


            return true;

        } catch (error) {

            console.error(
                "NITRIXA: Program load error:",
                error
            );

            showError(
                "We could not load this program right now. Please try again."
            );

            return false;

        }

    }


    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    function listenForAuthChanges() {

        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {

            return;

        }


        window.supabaseClient
            .auth
            .onAuthStateChange(
                function (
                    event,
                    session
                ) {

                    /*
                     * INITIAL_SESSION is handled
                     * separately by checkAuthentication().
                     */

                    if (
                        event ===
                        "INITIAL_SESSION"
                    ) {

                        return;

                    }


                    currentUser =
                        session
                            ? session.user
                            : null;


                    /*
                     * Update UI only after
                     * program has loaded.
                     */

                    if (selectedProgram) {

                        updateAuthenticationUI();

                    }

                }
            );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        resetStates();


        if (!window.supabaseClient) {

            showError(
                "Secure account connection is unavailable. Please refresh the page and try again."
            );

            return;

        }


        /*
         * STEP 1
         * Load active program.
         */

        const loaded =
            await loadProgram();


        if (!loaded) {
            return;
        }


        /*
         * STEP 2
         * Program loaded successfully.
         */

        hide(loadingElement);
        show(appElement);


        /*
         * STEP 3
         * Check current authentication.
         */

        await checkAuthentication();


        /*
         * STEP 4
         * Render logged-in or
         * logged-out state.
         */

        updateAuthenticationUI();

    }


    /* =====================================================
       START
       ===================================================== */

    function start() {

        listenForAuthChanges();

        initialize();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );

    } else {

        start();

    }

})();