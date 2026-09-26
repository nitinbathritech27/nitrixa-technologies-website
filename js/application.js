/* =========================================================
   NITRIXA TECHNOLOGIES
   APPLICATION FORM
   Supabase Submission
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       FORM
       ===================================================== */

    const form =
        document.getElementById("applicationForm");

    if (!form) {
        console.warn(
            "NITRIXA: Application form was not found."
        );

        return;
    }


    /* =====================================================
       SUBMIT BUTTON
       ===================================================== */

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    /* =====================================================
       FORM MESSAGE
       ===================================================== */

    let formMessage =
        document.getElementById("formMessage");


    /*
     * If the message element is missing from apply.html,
     * create it automatically.
     *
     * This prevents the success/error message from
     * silently disappearing.
     */

    if (!formMessage) {

        formMessage =
            document.createElement("div");

        formMessage.id =
            "formMessage";

        formMessage.className =
            "form-status";

        formMessage.setAttribute(
            "role",
            "status"
        );

        formMessage.setAttribute(
            "aria-live",
            "polite"
        );

        /*
         * Place the message immediately before
         * the submit button.
         */

        if (submitButton) {

            submitButton.insertAdjacentElement(
                "beforebegin",
                formMessage
            );

        } else {

            form.appendChild(
                formMessage
            );

        }

    }


    /* =====================================================
       MESSAGE HELPERS
       ===================================================== */

    const showMessage = (
        message,
        type
    ) => {

        if (!formMessage) {
            return;
        }


        formMessage.textContent =
            message;


        formMessage.className =
            `form-status ${type}`;


        formMessage.style.display =
            "block";


        /*
         * Make sure the message is visible
         * after submission.
         */

        formMessage.hidden =
            false;

    };


    const clearMessage = () => {

        if (!formMessage) {
            return;
        }


        formMessage.textContent =
            "";


        formMessage.className =
            "form-status";


        formMessage.style.display =
            "none";


        formMessage.hidden =
            true;

    };


    /* =====================================================
       FIELD HELPER
       ===================================================== */

    const getValue = (
        name
    ) => {

        const field =
            form.elements[name];


        if (!field) {
            return "";
        }


        return field.value.trim();

    };


    /* =====================================================
       FORM VALIDATION
       ===================================================== */

    const validateForm = () => {

        const applicationType =
            getValue(
                "application_type"
            );


        const fullName =
            getValue(
                "full_name"
            );


        const email =
            getValue(
                "email"
            );


        const mobile =
            getValue(
                "mobile"
            );


        const qualification =
            getValue(
                "qualification"
            );


        const program =
            getValue(
                "program"
            );


        /* ---------------------------------------------
           APPLICATION TYPE
           --------------------------------------------- */

        if (!applicationType) {

            return (
                "Please select an application type."
            );

        }


        /* ---------------------------------------------
           FULL NAME
           --------------------------------------------- */

        if (
            fullName.length < 2
        ) {

            return (
                "Please enter your full name."
            );

        }


        /* ---------------------------------------------
           EMAIL
           --------------------------------------------- */

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                email
            )
        ) {

            return (
                "Please enter a valid email address."
            );

        }


        /* ---------------------------------------------
           MOBILE
           --------------------------------------------- */

        const mobilePattern =
            /^[0-9+\-\s()]{8,20}$/;


        if (
            !mobilePattern.test(
                mobile
            )
        ) {

            return (
                "Please enter a valid mobile number."
            );

        }


        /* ---------------------------------------------
           QUALIFICATION
           --------------------------------------------- */

        if (!qualification) {

            return (
                "Please select your qualification."
            );

        }


        /* ---------------------------------------------
           PROGRAM
           --------------------------------------------- */

        if (!program) {

            return (
                "Please select a program."
            );

        }


        /* ---------------------------------------------
           CONSENT
           --------------------------------------------- */

        const consent =
            form.elements[
                "consent"
            ];


        if (
            consent &&
            !consent.checked
        ) {

            return (
                "Please accept the application consent."
            );

        }


        return null;

    };


    /* =====================================================
       SUBMIT EVENT
       ===================================================== */

    form.addEventListener(
        "submit",
        async (event) => {

            /*
             * Prevent normal browser form submission.
             */

            event.preventDefault();

            event.stopPropagation();


            /* ---------------------------------------------
               CLEAR OLD MESSAGE
               --------------------------------------------- */

            clearMessage();


            /* ---------------------------------------------
               VALIDATION
               --------------------------------------------- */

            const validationError =
                validateForm();


            if (validationError) {

                showMessage(
                    validationError,
                    "error"
                );

                return;

            }


            /* ---------------------------------------------
               SUPABASE CHECK
               --------------------------------------------- */

            if (
                typeof supabaseClient === "undefined" ||
                !supabaseClient
            ) {

                console.error(
                    "NITRIXA: Supabase client is not available."
                );


                showMessage(
                    "Application service is currently unavailable. Please try again later.",
                    "error"
                );


                return;

            }


            /* ---------------------------------------------
               BUTTON STATE
               --------------------------------------------- */

            const originalButtonText =
                submitButton
                    ? submitButton.textContent
                    : "Submit Application";


            if (submitButton) {

                submitButton.disabled =
                    true;


                submitButton.textContent =
                    "Submitting...";

            }


            /* ---------------------------------------------
               BUILD APPLICATION DATA
               --------------------------------------------- */

            try {

                const graduationYear =
                    getValue(
                        "graduation_year"
                    );


                const applicationData = {

                    application_type:
                        getValue(
                            "application_type"
                        ),


                    full_name:
                        getValue(
                            "full_name"
                        ),


                    email:
                        getValue(
                            "email"
                        ),


                    mobile:
                        getValue(
                            "mobile"
                        ),


                    qualification:
                        getValue(
                            "qualification"
                        ),


                    college:
                        getValue(
                            "college"
                        ) || null,


                    graduation_year:
                        graduationYear
                            ? Number(
                                graduationYear
                            )
                            : null,


                    city:
                        getValue(
                            "city"
                        ) || null,


                    program:
                        getValue(
                            "program"
                        ),


                    message:
                        getValue(
                            "message"
                        ) || null,


                    status:
                        "NEW"

                };


                /* -----------------------------------------
                   SUPABASE INSERT
                   ----------------------------------------- */

                const {
                    error
                } = await supabaseClient
                    .from(
                        "applications"
                    )
                    .insert(
                        applicationData
                    );


                /* -----------------------------------------
                   DATABASE ERROR
                   ----------------------------------------- */

                if (error) {

                    console.error(
                        "NITRIXA application submission error:",
                        error
                    );


                    showMessage(
                        "We could not submit your application right now. Please try again.",
                        "error"
                    );


                    return;

                }


                /* -----------------------------------------
                   RESET FORM
                   ----------------------------------------- */

                form.reset();


                /* -----------------------------------------
                   RESET CHARACTER COUNTER
                   ----------------------------------------- */

                const messageField =
                    form.elements[
                        "message"
                    ];


                const messageCounter =
                    document.getElementById(
                        "messageCounter"
                    );


                if (
                    messageField &&
                    messageCounter
                ) {

                    messageCounter.textContent =
                        "0/1000";

                }


                /* -----------------------------------------
                   SUCCESS MESSAGE
                   ----------------------------------------- */

                showMessage(
                    "Application submitted successfully. Our team will contact you regarding the next steps.",
                    "success"
                );


                /*
                 * Scroll slightly toward the message so
                 * the user can clearly see confirmation.
                 */

                if (
                    formMessage &&
                    typeof formMessage.scrollIntoView ===
                        "function"
                ) {

                    formMessage.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                }


                console.log(
                    "NITRIXA: Application submitted successfully."
                );


            } catch (error) {

                /* -----------------------------------------
                   UNEXPECTED ERROR
                   ----------------------------------------- */

                console.error(
                    "NITRIXA unexpected application error:",
                    error
                );


                showMessage(
                    "Something went wrong while submitting your application. Please try again.",
                    "error"
                );

            } finally {

                /* -----------------------------------------
                   RESTORE BUTTON
                   ----------------------------------------- */

                if (submitButton) {

                    submitButton.disabled =
                        false;


                    submitButton.textContent =
                        originalButtonText;

                }

            }

        }
    );

});