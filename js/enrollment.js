/* =========================================================
   NITRIXA TECHNOLOGIES
   ENROLLMENT FLOW

   FLOW:

   Programs
      ↓
   Login / Register
      ↓
   Dashboard
      ↓
   Select Program
      ↓
   Enrollment Path
      ↓
   create-enrollment Edge Function
      ↓
   PENDING_PAYMENT
      ↓
   payment.html?enrollment=ID

   IMPORTANT:
   - Enrollment requires authenticated user.
   - Intern ID is NOT required.
   - Enrollment is created BEFORE payment.
   - Amount is taken from trusted database data through Edge Function.
   - Browser never creates the enrollment directly in Supabase.
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        "use strict";


        /* =====================================================
           SUPABASE
        ===================================================== */

        const supabase =
            window.supabaseClient;


        if (
            !supabase ||
            !supabase.auth
        ) {

            console.error(
                "NITRIXA: Supabase client is unavailable."
            );

            showEnrollmentError(
                "Authentication service is currently unavailable. Please refresh the page and try again."
            );

            return;

        }


        /* =====================================================
           ELEMENTS
        ===================================================== */

        const enrollmentApp =
            document.getElementById(
                "enrollmentApp"
            );

        const loadingState =
            document.getElementById(
                "enrollmentLoading"
            );

        const errorState =
            document.getElementById(
                "enrollmentError"
            );

        const errorMessage =
            document.getElementById(
                "enrollmentErrorMessage"
            );

        const programName =
            document.getElementById(
                "programName"
            );

        const programDescription =
            document.getElementById(
                "programDescription"
            );

        const programTags =
            document.getElementById(
                "programTags"
            );

        const programFee =
            document.getElementById(
                "programFee"
            );

        const programPaymentNote =
            document.getElementById(
                "programPaymentNote"
            );

        const programType =
            document.getElementById(
                "programType"
            );

        const programDuration =
            document.getElementById(
                "programDuration"
            );

        const programLevel =
            document.getElementById(
                "programLevel"
            );

        const programPaymentModel =
            document.getElementById(
                "programPaymentModel"
            );

        const enrollmentAuthGate =
            document.getElementById(
                "enrollmentAuthGate"
            );

        const enrollmentLoginButton =
            document.getElementById(
                "enrollmentLoginButton"
            );

        const enrollmentAccountStatus =
            document.getElementById(
                "enrollmentAccountStatus"
            );

        const enrollmentPathSection =
            document.getElementById(
                "enrollmentPathSection"
            );

        const pathGrid =
            document.getElementById(
                "pathGrid"
            );


        /* =====================================================
           URL
        ===================================================== */

        const params =
            new URLSearchParams(
                window.location.search
            );


        const programSlug =
            (
                params.get(
                    "program"
                ) || ""
            )
                .trim()
                .toLowerCase();


        /* =====================================================
           STATE
        ===================================================== */

        let selectedProgram = null;

        let currentSession = null;

        let enrollmentInProgress = false;


        /* =====================================================
           BASIC UI HELPERS
        ===================================================== */

        function setHidden(
            element,
            hidden
        ) {

            if (!element) {
                return;
            }

            element.hidden = hidden;

        }


        function showLoading() {

            setHidden(
                loadingState,
                false
            );

            setHidden(
                errorState,
                true
            );

            setHidden(
                enrollmentApp,
                true
            );

        }


        function showApplication() {

            setHidden(
                loadingState,
                true
            );

            setHidden(
                errorState,
                true
            );

            setHidden(
                enrollmentApp,
                false
            );

        }


        function showEnrollmentError(
            message
        ) {

            if (errorMessage) {

                errorMessage.textContent =
                    message;

            }

            setHidden(
                loadingState,
                true
            );

            setHidden(
                enrollmentApp,
                true
            );

            setHidden(
                errorState,
                false
            );

        }


        /* =====================================================
           FORMAT CURRENCY
        ===================================================== */

        function formatCurrency(
            value
        ) {

            const amount =
                Number(value);

            if (
                !Number.isFinite(
                    amount
                )
            ) {

                return "₹0";

            }

            return new Intl.NumberFormat(
                "en-IN",
                {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                }
            ).format(
                amount
            );

        }


        /* =====================================================
           ESCAPE HTML
        ===================================================== */

        function escapeHtml(
            value
        ) {

            return String(
                value ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

        }


        /* =====================================================
           NORMALIZE PROGRAM TYPE
        ===================================================== */

        function normalizeProgramType(
            value
        ) {

            return String(
                value ?? ""
            )
                .trim()
                .toUpperCase()
                .replace(
                    /[\s-]+/g,
                    "_"
                );

        }


        /* =====================================================
           VALIDATE PROGRAM
        ===================================================== */

        function validateProgramPath(
            program,
            path
        ) {

            const type =
                normalizeProgramType(
                    program.program_type
                );


            if (
                type === "INTERNSHIP"
            ) {

                return (
                    path ===
                    "internship"
                );

            }


            if (
                type ===
                "TRAINING_AND_INTERNSHIP"
            ) {

                return (
                    path ===
                    "training-internship"
                );

            }


            return false;

        }


        /* =====================================================
           PROGRAM PAYMENT NOTE
        ===================================================== */

        function getPaymentNote(
            program
        ) {

            const paymentModel =
                String(
                    program.payment_model ?? ""
                )
                    .trim()
                    .toUpperCase();


            if (
                paymentModel ===
                "FULL_AND_INSTALLMENT"
            ) {

                return "Full payment or eligible 3-month installment options may be available.";

            }


            if (
                paymentModel ===
                "FULL_ONLY"
            ) {

                return "Full payment is required for enrollment.";

            }


            return "Payment is required to activate your enrollment.";

        }


        /* =====================================================
           PROGRAM DURATION
        ===================================================== */

        function getProgramDuration(
            program
        ) {

            const type =
                normalizeProgramType(
                    program.program_type
                );


            if (
                type ===
                "TRAINING_AND_INTERNSHIP"
            ) {

                const trainingDuration =
                    program.training_duration;

                const internshipDuration =
                    program.internship_duration;


                if (
                    trainingDuration &&
                    internshipDuration
                ) {

                    return (
                        `Training: ${trainingDuration} • Internship: ${internshipDuration}`
                    );

                }


                if (
                    trainingDuration
                ) {

                    return (
                        `Training: ${trainingDuration}`
                    );

                }


                if (
                    internshipDuration
                ) {

                    return (
                        `Internship: ${internshipDuration}`
                    );

                }

            }


            return (
                program.duration ||
                "Program duration"
            );

        }


        /* =====================================================
           RENDER PROGRAM
        ===================================================== */

        function renderProgram(
            program
        ) {

            selectedProgram =
                program;


            if (programName) {

                programName.textContent =
                    program.name ||
                    "NITRIXA Program";

            }


            if (programDescription) {

                programDescription.textContent =
                    program.description ||
                    "Explore this NITRIXA TECHNOLOGIES program and continue your enrollment from your account.";

            }


            if (programFee) {

                programFee.textContent =
                    formatCurrency(
                        program.fee
                    );

            }


            if (programPaymentNote) {

                programPaymentNote.textContent =
                    getPaymentNote(
                        program
                    );

            }


            if (programType) {

                programType.textContent =
                    normalizeProgramType(
                        program.program_type
                    )
                        .replace(
                            /_/g,
                            " "
                        );

            }


            if (programDuration) {

                programDuration.textContent =
                    getProgramDuration(
                        program
                    );

            }


            if (programLevel) {

                programLevel.textContent =
                    program.level ||
                    "All levels";

            }


            if (programPaymentModel) {

                programPaymentModel.textContent =
                    program.payment_model ||
                    "Standard payment";

            }


            renderProgramTags(
                program
            );

        }


        /* =====================================================
           PROGRAM TAGS
        ===================================================== */

        function renderProgramTags(
            program
        ) {

            if (!programTags) {
                return;
            }


            const tags = [];


            const type =
                normalizeProgramType(
                    program.program_type
                );


            if (type) {

                tags.push(
                    type
                        .replace(
                            /_/g,
                            " "
                        )
                );

            }


            if (
                program.duration
            ) {

                tags.push(
                    program.duration
                );

            }


            if (
                program.payment_model
            ) {

                tags.push(
                    program.payment_model
                        .replace(
                            /_/g,
                            " "
                        )
                );

            }


            programTags.innerHTML =
                tags
                    .map(
                        tag =>
                            `<span class="program-tag">${escapeHtml(tag)}</span>`
                    )
                    .join("");

        }


        /* =====================================================
           LOAD PROGRAM
        ===================================================== */

        async function loadProgram() {

            if (!programSlug) {

                showEnrollmentError(
                    "No program was selected. Please return to the Programs page and choose a program."
                );

                return false;

            }


            const {
                data,
                error
            } = await supabase
                .from(
                    "programs"
                )
                .select(
                    `
                    id,
                    name,
                    slug,
                    description,
                    program_type,
                    duration,
                    training_duration,
                    internship_duration,
                    payment_model,
                    fee,
                    level,
                    status
                    `
                )
                .eq(
                    "slug",
                    programSlug
                )
                .eq(
                    "status",
                    "ACTIVE"
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "NITRIXA: Program loading failed:",
                    error
                );

                showEnrollmentError(
                    "We could not load this program. Please try again."
                );

                return false;

            }


            if (!data) {

                showEnrollmentError(
                    "This program is not available or is no longer active."
                );

                return false;

            }


            renderProgram(
                data
            );


            return true;

        }


        /* =====================================================
           GET SESSION
        ===================================================== */

        async function getCurrentSession() {

            const {
                data,
                error
            } = await supabase.auth.getSession();


            if (error) {

                console.error(
                    "NITRIXA: Session lookup failed:",
                    error
                );

                return null;

            }


            return (
                data?.session ||
                null
            );

        }


        /* =====================================================
           AUTH GATE
        ===================================================== */

        function renderAuthenticationState(
            session
        ) {

            currentSession =
                session;


            if (!session) {

                /*
                 * User is not logged in.
                 *
                 * Enrollment cannot be created
                 * without authentication.
                 */

                setHidden(
                    enrollmentAuthGate,
                    false
                );

                setHidden(
                    enrollmentAccountStatus,
                    true
                );

                setHidden(
                    enrollmentPathSection,
                    true
                );


                if (
                    enrollmentLoginButton
                ) {

                    enrollmentLoginButton.href =
                        "login.html";

                }


                return;

            }


            /*
             * User is authenticated.
             */

            setHidden(
                enrollmentAuthGate,
                true
            );

            setHidden(
                enrollmentAccountStatus,
                false
            );

            setHidden(
                enrollmentPathSection,
                false
            );


            if (
                enrollmentAccountStatus
            ) {

                enrollmentAccountStatus.textContent =
                    "You are signed in. Select your enrollment path to continue.";

            }


            renderEnrollmentPaths();

        }


        /* =====================================================
           RENDER ENROLLMENT PATHS
        ===================================================== */

        function renderEnrollmentPaths() {

            if (!pathGrid) {
                return;
            }


            if (!selectedProgram) {
                return;
            }


            const type =
                normalizeProgramType(
                    selectedProgram.program_type
                );


            /*
             * Clear old cards.
             */

            pathGrid.innerHTML = "";


            /*
             * INTERNSHIP
             */

            if (
                type ===
                "INTERNSHIP"
            ) {

                pathGrid.innerHTML =
                    createPathCard(
                        {
                            path:
                                "internship",

                            title:
                                "Internship",

                            description:
                                "Enroll in the internship program and continue to payment.",

                            duration:
                                selectedProgram.internship_duration ||
                                selectedProgram.duration ||
                                "Program duration",

                            fee:
                                selectedProgram.fee
                        }
                    );

            }


            /*
             * TRAINING + INTERNSHIP
             */

            else if (
                type ===
                "TRAINING_AND_INTERNSHIP"
            ) {

                pathGrid.innerHTML =
                    createPathCard(
                        {
                            path:
                                "training-internship",

                            title:
                                "Training + Internship",

                            description:
                                "Complete the training first. Internship access becomes available after training completion and administrative approval.",

                            duration:
                                getProgramDuration(
                                    selectedProgram
                                ),

                            fee:
                                selectedProgram.fee,

                            featured:
                                true
                        }
                    );

            }


            /*
             * Unsupported / legacy program.
             */

            else {

                pathGrid.innerHTML =
                    `
                    <div class="enrollment-path-empty">
                        <strong>
                            Enrollment currently unavailable
                        </strong>

                        <p>
                            This program type is not currently available for online enrollment.
                        </p>
                    </div>
                    `;

            }


            attachPathEvents();

        }


        /* =====================================================
           PATH CARD
        ===================================================== */

        function createPathCard(
            options
        ) {

            const featuredClass =
                options.featured
                    ? " is-featured"
                    : "";


            return `
                <article
                    class="enrollment-path-card${featuredClass}"
                    data-enrollment-path="${escapeHtml(options.path)}"
                >

                    <div class="enrollment-path-card-content">

                        <span class="enrollment-path-badge">
                            ${options.featured ? "RECOMMENDED PATH" : "ENROLLMENT PATH"}
                        </span>

                        <h3>
                            ${escapeHtml(options.title)}
                        </h3>

                        <p>
                            ${escapeHtml(options.description)}
                        </p>

                        <div class="enrollment-path-meta">

                            <div>
                                <span>Duration</span>
                                <strong>
                                    ${escapeHtml(options.duration)}
                                </strong>
                            </div>

                            <div>
                                <span>Program Fee</span>
                                <strong>
                                    ${escapeHtml(
                                        formatCurrency(
                                            options.fee
                                        )
                                    )}
                                </strong>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="enrollment-path-button"
                            data-start-enrollment="${escapeHtml(options.path)}"
                        >
                            Continue to Enrollment
                            <span aria-hidden="true">→</span>
                        </button>

                    </div>

                </article>
            `;

        }


        /* =====================================================
           ATTACH PATH EVENTS
        ===================================================== */

        function attachPathEvents() {

            const buttons =
                document.querySelectorAll(
                    "[data-start-enrollment]"
                );


            buttons.forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const path =
                                button.getAttribute(
                                    "data-start-enrollment"
                                );


                            await startEnrollment(
                                path,
                                button
                            );

                        }
                    );

                }
            );

        }


        /* =====================================================
           CREATE ENROLLMENT
        ===================================================== */

        async function startEnrollment(
            path,
            button
        ) {

            if (
                enrollmentInProgress
            ) {

                return;

            }


            /*
             * Session safety check.
             */

            const session =
                await getCurrentSession();


            if (!session) {

                window.location.href =
                    "login.html";

                return;

            }


            if (!selectedProgram) {

                showEnrollmentError(
                    "Program information is unavailable. Please return to the Programs page and try again."
                );

                return;

            }


            /*
             * Validate path.
             */

            if (
                !validateProgramPath(
                    selectedProgram,
                    path
                )
            ) {

                showEnrollmentError(
                    "The selected enrollment path is not available for this program."
                );

                return;

            }


            enrollmentInProgress =
                true;


            const originalText =
                button
                    ? button.innerHTML
                    : "";


            if (button) {

                button.disabled =
                    true;

                button.innerHTML =
                    `
                    <span>
                        Creating enrollment...
                    </span>
                    `;

            }


            try {

                /*
                 * Get current access token.
                 */

                const {
                    data:
                    sessionData,
                    error:
                    sessionError
                } =
                    await supabase.auth.getSession();


                if (
                    sessionError ||
                    !sessionData?.session
                ) {

                    throw new Error(
                        "Your login session has expired. Please login again."
                    );

                }


                const accessToken =
                    sessionData.session
                        .access_token;


                /*
                 * Supabase Edge Function.
                 */

                const functionUrl =
                    `${getSupabaseFunctionBaseUrl()}/create-enrollment`;


                const response =
                    await fetch(
                        functionUrl,
                        {
                            method:
                                "POST",

                            headers:
                                {
                                    "Authorization":
                                        `Bearer ${accessToken}`,

                                    "apikey":
                                        getSupabasePublishableKey(),

                                    "Content-Type":
                                        "application/json"
                                },

                            body:
                                JSON.stringify(
                                    {
                                        programId:
                                            selectedProgram.id,

                                        enrollmentPath:
                                            path
                                    }
                                )
                        }
                    );


                /*
                 * Parse response safely.
                 */

                let result = null;


                try {

                    result =
                        await response.json();

                } catch {

                    result = null;

                }


                console.log(
                    "NITRIXA: create-enrollment response:",
                    result
                );


                /*
                 * Already enrolled.
                 */

                if (
                    response.status ===
                        409 &&
                    result?.code ===
                        "ALREADY_ENROLLED"
                ) {

                    throw new Error(
                        "You are already enrolled in this program."
                    );

                }


                /*
                 * Duplicate enrollment.
                 */

                if (
                    response.status ===
                        409 &&
                    result?.code ===
                        "DUPLICATE_ENROLLMENT"
                ) {

                    throw new Error(
                        "An enrollment already exists for this program."
                    );

                }


                /*
                 * Generic API error.
                 */

                if (
                    !response.ok ||
                    !result?.success
                ) {

                    throw new Error(
                        result?.error ||
                        "Unable to create your enrollment."
                    );

                }


                /*
                 * Enrollment ID is mandatory.
                 */

                const enrollmentId =
                    result.enrollmentId;


                if (!enrollmentId) {

                    throw new Error(
                        "Enrollment was created but no enrollment ID was returned."
                    );

                }


                /*
                 * Continue to payment.
                 */

                window.location.href =
                    `payment.html?enrollment=${encodeURIComponent(
                        enrollmentId
                    )}`;

            } catch (error) {

                console.error(
                    "NITRIXA: Enrollment creation failed:",
                    error
                );


                const message =
                    getEnrollmentErrorMessage(
                        error
                    );


                showInlineEnrollmentMessage(
                    message
                );


                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        originalText;

                }

            } finally {

                enrollmentInProgress =
                    false;

            }

        }


        /* =====================================================
           SUPABASE FUNCTION BASE URL
        ===================================================== */

        function getSupabaseFunctionBaseUrl() {

            /*
             * supabase.js already contains the project URL.
             * Use the same client configuration rather than
             * duplicating the project URL here.
             */

            const clientUrl =
                supabase.supabaseUrl;


            if (!clientUrl) {

                throw new Error(
                    "Supabase project URL is unavailable."
                );

            }


            return (
                String(
                    clientUrl
                ).replace(
                    /\/+$/,
                    ""
                ) +
                "/functions/v1"
            );

        }


        /* =====================================================
           SUPABASE PUBLISHABLE KEY
        ===================================================== */

        function getSupabasePublishableKey() {

            /*
             * supabase-js exposes the public project key
             * through the client instance.
             */

            const key =
                supabase.supabaseKey;


            if (!key) {

                throw new Error(
                    "Supabase publishable key is unavailable."
                );

            }


            return key;

        }


        /* =====================================================
           INLINE ERROR
        ===================================================== */

        function showInlineEnrollmentMessage(
            message
        ) {

            /*
             * Prefer existing error/message element if present.
             */

            if (
                errorMessage
            ) {

                errorMessage.textContent =
                    message;

            }


            /*
             * If enrollment page has a dedicated
             * inline message element, use it.
             */

            const inlineMessage =
                document.getElementById(
                    "enrollmentMessage"
                );


            if (
                inlineMessage
            ) {

                inlineMessage.textContent =
                    message;

                inlineMessage.hidden =
                    false;

                inlineMessage.classList.add(
                    "is-error"
                );

            }


            /*
             * Keep the enrollment page visible.
             */

            setHidden(
                loadingState,
                true
            );

            setHidden(
                errorState,
                true
            );

            setHidden(
                enrollmentApp,
                false
            );

        }


        /* =====================================================
           ERROR MESSAGE NORMALIZATION
        ===================================================== */

        function getEnrollmentErrorMessage(
            error
        ) {

            const message =
                String(
                    error?.message ||
                    ""
                )
                    .trim();


            if (!message) {

                return "We could not start your enrollment. Please try again.";

            }


            const normalized =
                message.toLowerCase();


            if (
                normalized.includes(
                    "expired"
                ) ||
                normalized.includes(
                    "invalid login"
                ) ||
                normalized.includes(
                    "invalid or expired"
                )
            ) {

                return "Your login session has expired. Please login again.";

            }


            if (
                normalized.includes(
                    "already enrolled"
                )
            ) {

                return "You are already enrolled in this program. Please open your dashboard to continue.";

            }


            if (
                normalized.includes(
                    "inactive"
                ) ||
                normalized.includes(
                    "not found"
                )
            ) {

                return "This program is currently unavailable.";

            }


            return message;

        }


        /* =====================================================
           LOGIN BUTTON
        ===================================================== */

        if (
            enrollmentLoginButton
        ) {

            enrollmentLoginButton.addEventListener(
                "click",
                event => {

                    /*
                     * Do not preserve program/path context.
                     *
                     * Locked architecture:
                     *
                     * Login
                     *   ↓
                     * Dashboard
                     *   ↓
                     * Choose program
                     */

                    event.preventDefault();

                    window.location.href =
                        "login.html";

                }
            );

        }


        /* =====================================================
           INITIALIZE
        ===================================================== */

        showLoading();


        const programLoaded =
            await loadProgram();


        if (!programLoaded) {

            return;

        }


        const session =
            await getCurrentSession();


        renderAuthenticationState(
            session
        );


        showApplication();


        /* =====================================================
           AUTH STATE CHANGE
        ===================================================== */

        supabase.auth.onAuthStateChange(
            (
                event,
                session
            ) => {

                /*
                 * Avoid unnecessary reload loops.
                 */

                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    renderAuthenticationState(
                        null
                    );

                    return;

                }


                if (
                    event ===
                    "SIGNED_IN" ||
                    event ===
                    "TOKEN_REFRESHED" ||
                    event ===
                    "USER_UPDATED"
                ) {

                    renderAuthenticationState(
                        session
                    );

                }

            }
        );

    }
);