/* =========================================================
   NITRIXA TECHNOLOGIES
   PUBLIC APPLICATION MODULE

   Responsibilities:
   - Load selected active program from Supabase
   - Populate program details
   - Populate program/application type
   - Validate application form
   - Prevent duplicate rapid submissions
   - Submit application to Supabase
   - Show loading/success/error states

   NOTE:
   Application submission does NOT create enrollment,
   payment, Intern ID, or Intern Portal access.
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DOM READY
    ===================================================== */

    function initializeApplication() {

        console.log(
            "NITRIXA: Application module starting..."
        );


        const form =
            document.getElementById(
                "applicationForm"
            );


        if (!form) {

            console.error(
                "NITRIXA: Application form not found."
            );

            return;
        }


        if (!window.supabaseClient) {

            console.error(
                "NITRIXA: Supabase client is unavailable."
            );

            showFormStatus(
                "The application service is currently unavailable. Please try again later.",
                "error"
            );

            return;
        }


        console.log(
            "NITRIXA: Application module initialized."
        );


        setupMessageCounter();

        setupFormValidation();

        loadSelectedProgram();


        form.addEventListener(
            "submit",
            handleSubmit
        );

    }



    /* =====================================================
       PROGRAM STATE
    ===================================================== */

    let selectedProgram = null;

    let submitting = false;



    /* =====================================================
       GET PROGRAM FROM URL
    ===================================================== */

    function getProgramIdentifier() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return (
            params.get("program") ||
            ""
        ).trim();
    }



    /* =====================================================
       LOAD SELECTED PROGRAM
    ===================================================== */

    async function loadSelectedProgram() {

        const identifier =
            getProgramIdentifier();


        console.log(
            "NITRIXA: Selected program identifier:",
            identifier
        );


        if (!identifier) {

            /*
             * No specific program selected.
             *
             * We still allow the user to choose from
             * all active programs.
             */

            await loadProgramOptions();

            return;
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
                        identifier
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "NITRIXA: Selected program load error:",
                    error
                );

                showProgramError();

                await loadProgramOptions();

                return;
            }


            if (!data) {

                console.warn(
                    "NITRIXA: Selected program was not found:",
                    identifier
                );

                showProgramError();

                await loadProgramOptions();

                return;
            }


            selectedProgram =
                data;


            console.log(
                "NITRIXA: Selected program loaded:",
                selectedProgram
            );


            renderSelectedProgram(
                selectedProgram
            );


            setApplicationTypeFromProgram(
                selectedProgram
            );


            hideProgramError();


        } catch (error) {

            console.error(
                "NITRIXA: Unexpected selected program error:",
                error
            );

            showProgramError();

            await loadProgramOptions();
        }
    }



    /* =====================================================
       LOAD PROGRAM OPTIONS
    ===================================================== */

    async function loadProgramOptions() {

        const select =
            document.getElementById(
                "program"
            );


        /*
         * The new Apply page intentionally uses the selected
         * program card as the primary program display.
         *
         * If a user opens apply.html directly, create a
         * fallback program selector dynamically.
         */

        if (!select) {

            createFallbackProgramSelector();

            return;
        }


        try {

            const {
                data,
                error
            } =
                await window.supabaseClient
                    .from("programs")
                    .select(
                        "id,name,slug,program_type,status"
                    )
                    .eq(
                        "status",
                        "ACTIVE"
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true
                        }
                    );


            if (error) {

                console.error(
                    "NITRIXA: Program options error:",
                    error
                );

                return;
            }


            const programs =
                Array.isArray(data)
                    ? data
                    : [];


            populateProgramSelect(
                select,
                programs
            );

        } catch (error) {

            console.error(
                "NITRIXA: Unexpected program options error:",
                error
            );
        }
    }



    /* =====================================================
       FALLBACK PROGRAM SELECTOR
    ===================================================== */

    function createFallbackProgramSelector() {

        const applicationType =
            document.getElementById(
                "applicationType"
            );


        if (!applicationType) {
            return;
        }


        const section =
            applicationType.closest(
                ".form-section"
            );


        if (!section) {
            return;
        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "form-group";


        wrapper.innerHTML = `

            <label for="program">

                Preferred Program

                <span>
                    *
                </span>

            </label>


            <select
                id="program"
                name="program"
                required
            >

                <option value="">
                    Loading programs...
                </option>

            </select>


            <small
                class="form-error"
                data-error-for="program"
            ></small>

        `;


        section.parentNode.insertBefore(
            wrapper,
            section.nextSibling
        );


        loadProgramOptions();
    }



    /* =====================================================
       POPULATE PROGRAM SELECT
    ===================================================== */

    function populateProgramSelect(
        select,
        programs
    ) {

        select.innerHTML = `

            <option value="">
                Select a program
            </option>

        `;


        programs.forEach(
            function (program) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    program.slug ||
                    program.id;


                option.textContent =
                    program.name;


                option.dataset.programType =
                    program.program_type ||
                    "";


                select.appendChild(
                    option
                );

            }
        );


        select.addEventListener(
            "change",
            handleProgramSelection
        );
    }



    /* =====================================================
       PROGRAM SELECT CHANGE
    ===================================================== */

    async function handleProgramSelection(
        event
    ) {

        const identifier =
            event.target.value;


        if (!identifier) {

            selectedProgram =
                null;

            return;
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
                        identifier
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "NITRIXA: Program selection error:",
                    error
                );

                return;
            }


            if (!data) {

                return;
            }


            selectedProgram =
                data;


            renderSelectedProgram(
                selectedProgram
            );


            setApplicationTypeFromProgram(
                selectedProgram
            );


        } catch (error) {

            console.error(
                "NITRIXA: Program selection exception:",
                error
            );
        }
    }



    /* =====================================================
       RENDER SELECTED PROGRAM
    ===================================================== */

    function renderSelectedProgram(
        program
    ) {

        const loading =
            document.getElementById(
                "programLoading"
            );


        const details =
            document.getElementById(
                "programDetails"
            );


        if (loading) {

            loading.hidden =
                true;

        }


        if (details) {

            details.hidden =
                false;

        }


        setText(
            "selectedProgramName",
            program.name ||
            "Program"
        );


        setText(
            "selectedProgramCategory",
            program.category ||
            "Technology"
        );


        setText(
            "selectedProgramType",
            formatProgramType(
                program.program_type
            )
        );


        setText(
            "selectedProgramDescription",
            program.description ||
            "Practical technology development program."
        );


        setText(
            "selectedProgramLevel",
            formatLevel(
                program.level
            )
        );


        setText(
            "selectedProgramDuration",
            getDuration(
                program
            )
        );


        setText(
            "selectedProgramFee",
            formatCurrency(
                program.fee
            )
        );


        setText(
            "selectedProgramPayment",
            getPaymentText(
                program
            )
        );
    }



    /* =====================================================
       SET APPLICATION TYPE
    ===================================================== */

    function setApplicationTypeFromProgram(
        program
    ) {

        const select =
            document.getElementById(
                "applicationType"
            );


        if (!select) {
            return;
        }


        /*
         * INTERNSHIP
         * = Internship-only program
         *
         * TRAINING_AND_INTERNSHIP
         * = Training + Internship
         *
         * Database application_type currently uses:
         * INTERNSHIP / TRAINING
         */

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            select.value =
                "TRAINING";

        } else {

            select.value =
                "INTERNSHIP";
        }


        /*
         * The selected program determines the type,
         * therefore the user should not accidentally
         * choose an incompatible application type.
         */

        select.disabled =
            true;


        /*
         * Hidden-compatible value still submits because
         * disabled fields are NOT included in FormData.
         *
         * Therefore we add a hidden field.
         */

        let hiddenType =
            document.getElementById(
                "resolvedApplicationType"
            );


        if (!hiddenType) {

            hiddenType =
                document.createElement(
                    "input"
                );

            hiddenType.type =
                "hidden";

            hiddenType.id =
                "resolvedApplicationType";

            hiddenType.name =
                "application_type";

            select.parentNode.appendChild(
                hiddenType
            );
        }


        hiddenType.value =
            select.value;
    }



    /* =====================================================
       DURATION
    ===================================================== */

    function getDuration(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            const training =
                program.training_duration ||
                "—";


            const internship =
                program.internship_duration ||
                "—";


            return (
                training +
                " Training + " +
                internship +
                " Internship"
            );
        }


        return (
            program.internship_duration ||
            program.duration ||
            "—"
        );
    }



    /* =====================================================
       PAYMENT TEXT
    ===================================================== */

    function getPaymentText(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return (
                "Full payment during enrollment. Internship unlocks after training completion and required approval."
            );
        }


        if (
            program.payment_model ===
            "FULL_AND_INSTALLMENT"
        ) {

            return (
                "Full payment or 3-month installment may be available during enrollment."
            );
        }


        return (
            "Full payment during enrollment."
        );
    }



    /* =====================================================
       FORM VALIDATION
    ===================================================== */

    function setupFormValidation() {

        const fields = [
            "applicationType",
            "fullName",
            "email",
            "mobile",
            "qualification",
            "consent"
        ];


        fields.forEach(
            function (id) {

                const field =
                    document.getElementById(
                        id
                    );


                if (!field) {
                    return;
                }


                field.addEventListener(
                    "input",
                    function () {

                        clearFieldError(
                            field
                        );

                    }
                );


                field.addEventListener(
                    "change",
                    function () {

                        clearFieldError(
                            field
                        );

                    }
                );

            }
        );
    }



    /* =====================================================
       VALIDATE FORM
    ===================================================== */

    function validateForm() {

        let valid =
            true;


        clearAllErrors();


        const fullName =
            document.getElementById(
                "fullName"
            );


        const email =
            document.getElementById(
                "email"
            );


        const mobile =
            document.getElementById(
                "mobile"
            );


        const qualification =
            document.getElementById(
                "qualification"
            );


        const consent =
            document.getElementById(
                "consent"
            );


        if (
            !selectedProgram
        ) {

            showFormStatus(
                "Please select an active program before submitting.",
                "error"
            );

            valid =
                false;
        }


        if (
            !fullName ||
            fullName.value.trim().length < 2
        ) {

            showFieldError(
                fullName,
                "Please enter your full name."
            );

            valid =
                false;
        }


        const emailValue =
            email
                ? email.value.trim()
                : "";


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailValue ||
            !emailPattern.test(
                emailValue
            )
        ) {

            showFieldError(
                email,
                "Please enter a valid email address."
            );

            valid =
                false;
        }


        const mobileValue =
            mobile
                ? mobile.value.replace(
                    /\D/g,
                    ""
                )
                : "";


        if (
            mobileValue.length < 10 ||
            mobileValue.length > 15
        ) {

            showFieldError(
                mobile,
                "Please enter a valid mobile number."
            );

            valid =
                false;
        }


        if (
            !qualification ||
            !qualification.value
        ) {

            showFieldError(
                qualification,
                "Please select your qualification."
            );

            valid =
                false;
        }


        if (
            !consent ||
            !consent.checked
        ) {

            showFieldError(
                consent,
                "Please confirm the information provided."
            );

            valid =
                false;
        }


        return valid;
    }



    /* =====================================================
       SUBMIT
    ===================================================== */

    async function handleSubmit(
        event
    ) {

        event.preventDefault();


        if (submitting) {

            console.warn(
                "NITRIXA: Duplicate submit prevented."
            );

            return;
        }


        const valid =
            validateForm();


        if (!valid) {

            showFormStatus(
                "Please correct the highlighted fields.",
                "error"
            );

            return;
        }


        if (!selectedProgram) {

            showFormStatus(
                "Please select a valid active program.",
                "error"
            );

            return;
        }


        const form =
            document.getElementById(
                "applicationForm"
            );


        if (!form) {
            return;
        }


        submitting =
            true;


        setSubmitLoading(
            true
        );


        showFormStatus(
            "Submitting your application...",
            "loading"
        );


        try {

            const formData =
                new FormData(
                    form
                );


            const applicationType =
                getResolvedApplicationType();


            const payload = {

                application_type:
                    applicationType,

                full_name:
                    formData
                        .get("full_name")
                        .trim(),

                email:
                    formData
                        .get("email")
                        .trim()
                        .toLowerCase(),

                mobile:
                    formData
                        .get("mobile")
                        .replace(
                            /\D/g,
                            ""
                        ),

                qualification:
                    formData
                        .get("qualification") ||
                    null,

                college:
                    cleanOptionalValue(
                        formData.get(
                            "college"
                        )
                    ),

                graduation_year:
                    cleanOptionalValue(
                        formData.get(
                            "graduation_year"
                        )
                    ),

                city:
                    cleanOptionalValue(
                        formData.get(
                            "city"
                        )
                    ),

                /*
                 * Store the actual program name.
                 *
                 * This keeps the existing applications
                 * table compatible.
                 */

                program:
                    selectedProgram.name,

                message:
                    cleanOptionalValue(
                        formData.get(
                            "message"
                        )
                    ),

                status:
                    "NEW"
            };


            console.log(
                "NITRIXA: Application payload:",
                payload
            );


            /*
             * Basic duplicate protection.
             *
             * Public users are not allowed to read
             * application records under the intended
             * RLS model, so we do not perform a public
             * SELECT here.
             *
             * Database/RLS should remain responsible
             * for enforcing insert rules.
             */


            const {
                error
            } =
                await window.supabaseClient
                    .from("applications")
                    .insert(
                        payload
                    );


            if (error) {

                console.error(
                    "NITRIXA: Application submission error:",
                    error
                );


                handleSubmissionError(
                    error
                );


                return;
            }


            console.log(
                "NITRIXA: Application submitted successfully."
            );


            showSuccessState();


        } catch (error) {

            console.error(
                "NITRIXA: Unexpected application submission error:",
                error
            );


            showFormStatus(
                "Something went wrong while submitting your application. Please try again.",
                "error"
            );

        } finally {

            submitting =
                false;


            setSubmitLoading(
                false
            );
        }
    }



    /* =====================================================
       RESOLVED APPLICATION TYPE
    ===================================================== */

    function getResolvedApplicationType() {

        const hidden =
            document.getElementById(
                "resolvedApplicationType"
            );


        if (
            hidden &&
            hidden.value
        ) {

            return hidden.value;
        }


        const select =
            document.getElementById(
                "applicationType"
            );


        return (
            select
                ? select.value
                : ""
        );
    }



    /* =====================================================
       SUCCESS STATE
    ===================================================== */

    function showSuccessState() {

        const form =
            document.getElementById(
                "applicationForm"
            );


        if (!form) {
            return;
        }


        form.innerHTML = `

            <div
                class="application-success"
                style="
                    padding: 40px 10px;
                    text-align: center;
                "
            >

                <span
                    class="section-kicker"
                >
                    APPLICATION RECEIVED
                </span>


                <h2>
                    Application Submitted
                    <span class="text-gradient">
                        Successfully.
                    </span>
                </h2>


                <p>
                    Thank you for applying to
                    NITRIXA TECHNOLOGIES.
                </p>


                <p>
                    Your application has been received
                    for:
                </p>


                <strong>
                    ${escapeHtml(
                        selectedProgram.name
                    )}
                </strong>


                <p>
                    Our team can review your application
                    and contact you regarding the next steps.
                </p>


                <div
                    class="hero-actions"
                    style="
                        justify-content: center;
                        margin-top: 24px;
                    "
                >

                    <a
                        href="programs.html"
                        class="btn btn-secondary"
                    >
                        Explore Programs
                    </a>


                    <a
                        href="index.html"
                        class="btn btn-primary"
                    >
                        Back to Home
                    </a>

                </div>

            </div>

        `;
    }



    /* =====================================================
       ERROR HANDLER
    ===================================================== */

    function handleSubmissionError(
        error
    ) {

        if (
            error &&
            error.code === "23505"
        ) {

            showFormStatus(
                "An application with these details already exists.",
                "error"
            );

            return;
        }


        if (
            error &&
            error.code === "42501"
        ) {

            showFormStatus(
                "The application could not be submitted because database access is not configured correctly.",
                "error"
            );

            return;
        }


        if (
            error &&
            error.code === "23502"
        ) {

            showFormStatus(
                "A required application field is missing. Please review the form and try again.",
                "error"
            );

            return;
        }


        showFormStatus(
            "We could not submit your application right now. Please try again.",
            "error"
        );
    }



    /* =====================================================
       SUBMIT BUTTON
    ===================================================== */

    function setSubmitLoading(
        loading
    ) {

        const button =
            document.getElementById(
                "applicationSubmitButton"
            );


        if (!button) {
            return;
        }


        button.disabled =
            loading;


        button.textContent =
            loading
                ? "Submitting..."
                : "Submit Application";
    }



    /* =====================================================
       FORM STATUS
    ===================================================== */

    function showFormStatus(
        message,
        type
    ) {

        const status =
            document.getElementById(
                "formStatus"
            );


        if (!status) {
            return;
        }


        status.textContent =
            message;


        status.className =
            "form-status " +
            (
                type ||
                ""
            );
    }



    /* =====================================================
       FIELD ERROR
    ===================================================== */

    function showFieldError(
        field,
        message
    ) {

        if (!field) {
            return;
        }


        field.classList.add(
            "input-error"
        );


        const error =
            document.querySelector(
                `[data-error-for="${field.id}"]`
            );


        if (error) {

            error.textContent =
                message;
        }
    }



    /* =====================================================
       CLEAR FIELD ERROR
    ===================================================== */

    function clearFieldError(
        field
    ) {

        if (!field) {
            return;
        }


        field.classList.remove(
            "input-error"
        );


        const error =
            document.querySelector(
                `[data-error-for="${field.id}"]`
            );


        if (error) {

            error.textContent =
                "";
        }
    }



    /* =====================================================
       CLEAR ALL ERRORS
    ===================================================== */

    function clearAllErrors() {

        document
            .querySelectorAll(
                ".input-error"
            )
            .forEach(
                function (field) {

                    field.classList.remove(
                        "input-error"
                    );

                }
            );


        document
            .querySelectorAll(
                ".form-error"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        "";

                }
            );
    }



    /* =====================================================
       MESSAGE COUNTER
    ===================================================== */

    function setupMessageCounter() {

        const message =
            document.getElementById(
                "message"
            );


        const counter =
            document.getElementById(
                "messageCount"
            );


        if (
            !message ||
            !counter
        ) {
            return;
        }


        function updateCounter() {

            counter.textContent =
                message.value.length;

        }


        message.addEventListener(
            "input",
            updateCounter
        );


        updateCounter();
    }



    /* =====================================================
       PROGRAM ERROR
    ===================================================== */

    function showProgramError() {

        const loading =
            document.getElementById(
                "programLoading"
            );


        const details =
            document.getElementById(
                "programDetails"
            );


        const error =
            document.getElementById(
                "programError"
            );


        if (loading) {
            loading.hidden =
                true;
        }


        if (details) {
            details.hidden =
                true;
        }


        if (error) {
            error.hidden =
                false;
        }
    }



    /* =====================================================
       HIDE PROGRAM ERROR
    ===================================================== */

    function hideProgramError() {

        const error =
            document.getElementById(
                "programError"
            );


        if (error) {
            error.hidden =
                true;
        }
    }



    /* =====================================================
       TEXT HELPER
    ===================================================== */

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value ?? "";
        }
    }



    /* =====================================================
       FORMAT PROGRAM TYPE
    ===================================================== */

    function formatProgramType(
        value
    ) {

        if (!value) {
            return "Program";
        }


        const map = {

            "INTERNSHIP":
                "Internship",

            "TRAINING":
                "Training",

            "TRAINING_AND_INTERNSHIP":
                "Training + Internship"

        };


        return (
            map[value] ||
            String(
                value
            )
                .replaceAll(
                    "_",
                    " "
                )
        );
    }



    /* =====================================================
       FORMAT LEVEL
    ===================================================== */

    function formatLevel(
        value
    ) {

        if (!value) {
            return "All Levels";
        }


        return String(
            value
        )
            .replaceAll(
                "_",
                " "
            );
    }



    /* =====================================================
       FORMAT CURRENCY
    ===================================================== */

    function formatCurrency(
        value
    ) {

        const amount =
            Number(
                value
            );


        if (
            !Number.isFinite(
                amount
            )
        ) {

            return "—";
        }


        return (
            "₹" +
            amount.toLocaleString(
                "en-IN"
            )
        );
    }



    /* =====================================================
       OPTIONAL VALUE
    ===================================================== */

    function cleanOptionalValue(
        value
    ) {

        const cleaned =
            String(
                value ?? ""
            ).trim();


        return cleaned
            ? cleaned
            : null;
    }



    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }



    /* =====================================================
       INITIALIZE
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeApplication,
            {
                once: true
            }
        );

    } else {

        initializeApplication();

    }

})();