/* =========================================================
   NITRIXA TECHNOLOGIES
   SECURE PAYMENT CHECKOUT
   RAZORPAY TEST MODE

   CURRENT FLOW:

   Dashboard
        ↓
   Enrollment
        ↓
   PENDING_PAYMENT Enrollment
        ↓
   payment.html?enrollment=<ID>
        ↓
   Create Razorpay Order
        ↓
   Razorpay Checkout
        ↓
   Verify Payment
        ↓
   ACTIVE Enrollment
        ↓
   Intern ID
        ↓
   Intern Dashboard

   IMPORTANT:
   - Payment is linked to an enrollment.
   - Program fee is NOT trusted from the browser.
   - Enrollment ID is the primary payment reference.
   - Razorpay verification is handled by Supabase Edge Function.
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const loadingState =
        document.getElementById(
            "paymentLoadingState"
        );

    const errorState =
        document.getElementById(
            "paymentErrorState"
        );

    const errorMessage =
        document.getElementById(
            "paymentErrorMessage"
        );

    const checkoutSection =
        document.getElementById(
            "paymentCheckout"
        );

    const payNowButton =
        document.getElementById(
            "payNowButton"
        );

    const payNowButtonText =
        document.getElementById(
            "payNowButtonText"
        );

    const paymentProcessing =
        document.getElementById(
            "paymentProcessing"
        );

    const accountStatus =
        document.getElementById(
            "accountStatus"
        );

    const loginRequired =
        document.getElementById(
            "loginRequired"
        );

    const loginLink =
        document.getElementById(
            "loginLink"
        );


    /* =====================================================
       PROGRAM ELEMENTS
       ===================================================== */

    const programName =
        document.getElementById(
            "programName"
        );

    const programDescription =
        document.getElementById(
            "programDescription"
        );

    const programTypeBadge =
        document.getElementById(
            "programTypeBadge"
        );

    const programDuration =
        document.getElementById(
            "programDuration"
        );

    const enrollmentPathLabel =
        document.getElementById(
            "enrollmentPathLabel"
        );


    /* =====================================================
       SUMMARY ELEMENTS
       ===================================================== */

    const summaryProgramName =
        document.getElementById(
            "summaryProgramName"
        );

    const summaryEnrollmentPath =
        document.getElementById(
            "summaryEnrollmentPath"
        );

    const summaryProgramFee =
        document.getElementById(
            "summaryProgramFee"
        );

    const summaryTotal =
        document.getElementById(
            "summaryTotal"
        );


    /* =====================================================
       STATE
       ===================================================== */

    let enrollmentId = "";

    let enrollmentRecord = null;

    let selectedProgram = null;

    let selectedPath = "";

    let currentUser = null;

    let paymentStarting = false;


    /* =====================================================
       HELPERS
       ===================================================== */

    function showElement(element) {

        if (!element) {
            return;
        }

        element.classList.remove("is-hidden");

    }


    function hideElement(element) {

        if (!element) {
            return;
        }

        element.classList.add("is-hidden");

    }


    function setError(message) {

        if (errorMessage) {

            errorMessage.textContent =
                message ||
                "Something went wrong.";

        }

        hideElement(
            loadingState
        );

        hideElement(
            checkoutSection
        );

        showElement(
            errorState
        );

    }


    function formatCurrency(amount) {

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(
                numericAmount
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
            numericAmount
        );

    }


    function normalizeProgramType(value) {

        return String(
            value || ""
        )
            .trim()
            .toUpperCase();

    }


    function normalizePath(value) {

        return String(
            value || ""
        )
            .trim()
            .toLowerCase();

    }


    /* =====================================================
       GET ENROLLMENT ID
       ===================================================== */

    function getEnrollmentId() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return (
            params.get(
                "enrollment"
            ) || ""
        )
            .trim();

    }


    /* =====================================================
       FORMAT ENROLLMENT PATH
       ===================================================== */

    function formatEnrollmentPath(path) {

        const normalized =
            normalizePath(
                path
            );


        if (
            normalized ===
            "training-internship"
        ) {

            return "Training + Internship";

        }


        if (
            normalized ===
            "internship"
        ) {

            return "Internship Only";

        }


        return "Enrollment";

    }


    /* =====================================================
       BUILD LOGIN URL
       ===================================================== */

    function buildLoginUrl() {

        return "login.html";

    }


    /* =====================================================
       LOAD ENROLLMENT
       ===================================================== */

    async function loadEnrollment() {

        enrollmentId =
            getEnrollmentId();


        if (!enrollmentId) {

            setError(
                "No enrollment was selected. Please return to your dashboard and start the enrollment process again."
            );

            return false;

        }


        if (
            typeof window.supabaseClient ===
                "undefined" ||
            !window.supabaseClient
        ) {

            setError(
                "Secure database connection is unavailable. Please refresh the page and try again."
            );

            return false;

        }


        try {

            /*
             * Only select the enrollment belonging
             * to the current authenticated user.
             *
             * RLS also protects this query.
             */

            const {
                data,
                error
            } =
                await window.supabaseClient

                    .from("enrollments")

                    .select(`
                        id,
                        user_id,
                        program_id,
                        batch_id,
                        enrollment_path,
                        status,
                        amount,
                        created_at,
                        programs (
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
                            status
                        )
                    `)

                    .eq(
                        "id",
                        enrollmentId
                    )

                    .maybeSingle();


            if (error) {

                console.error(
                    "NITRIXA: Enrollment load error:",
                    error
                );

                setError(
                    "We could not verify this enrollment. Please return to your dashboard and try again."
                );

                return false;

            }


            if (!data) {

                setError(
                    "This enrollment could not be found or is not available for your account."
                );

                return false;

            }


            enrollmentRecord =
                data;


            /*
             * The enrollment must belong to
             * the authenticated user.
             *
             * The Edge Function also performs
             * server-side authorization.
             */

            if (
                currentUser &&
                data.user_id !==
                    currentUser.id
            ) {

                setError(
                    "This enrollment does not belong to the current account."
                );

                return false;

            }


            /*
             * Enrollment status validation.
             */

            const status =
                String(
                    data.status || ""
                )
                    .trim()
                    .toUpperCase();


            if (
                status ===
                "ACTIVE"
            ) {

                setError(
                    "This enrollment is already active. Please open your Intern Dashboard."
                );

                return false;

            }


            if (
                status ===
                "PAYMENT_VERIFIED"
            ) {

                setError(
                    "Payment for this enrollment has already been verified. Please open your Intern Dashboard."
                );

                return false;

            }


            if (
                status !==
                "PENDING_PAYMENT"
            ) {

                setError(
                    "This enrollment is not currently available for payment."
                );

                return false;

            }


            /*
             * Program must exist.
             */

            if (
                !data.programs
            ) {

                setError(
                    "The program connected to this enrollment could not be found."
                );

                return false;

            }


            selectedProgram =
                data.programs;


            /*
             * Program must still be ACTIVE.
             */

            const programStatus =
                String(
                    selectedProgram.status || ""
                )
                    .trim()
                    .toUpperCase();


            if (
                programStatus !==
                "ACTIVE"
            ) {

                setError(
                    "This program is no longer available for enrollment."
                );

                return false;

            }


            /*
             * Enrollment path.
             */

            selectedPath =
                normalizePath(
                    data.enrollment_path
                );


            if (
                selectedPath !==
                    "internship" &&
                selectedPath !==
                    "training-internship"
            ) {

                setError(
                    "This enrollment has an invalid enrollment path."
                );

                return false;

            }


            /*
             * Validate program type against
             * enrollment path.
             */

            const programType =
                normalizeProgramType(
                    selectedProgram.program_type
                );


            if (
                selectedPath ===
                    "internship" &&
                programType !==
                    "INTERNSHIP"
            ) {

                setError(
                    "This enrollment path is not valid for the selected program."
                );

                return false;

            }


            if (
                selectedPath ===
                    "training-internship" &&
                programType !==
                    "TRAINING_AND_INTERNSHIP"
            ) {

                setError(
                    "This enrollment path is not valid for the selected program."
                );

                return false;

            }


            /*
             * Validate trusted enrollment amount.
             *
             * Payment page displays the amount saved
             * on the enrollment, not a browser-supplied
             * amount.
             */

            const enrollmentAmount =
                Number(
                    data.amount
                );


            if (
                !Number.isFinite(
                    enrollmentAmount
                ) ||
                enrollmentAmount <= 0
            ) {

                setError(
                    "This enrollment does not have a valid payment amount."
                );

                return false;

            }


            /*
             * Also verify that the program has
             * a valid fee.
             */

            const programFee =
                Number(
                    selectedProgram.fee
                );


            if (
                !Number.isFinite(
                    programFee
                ) ||
                programFee <= 0
            ) {

                setError(
                    "This program does not currently have a valid enrollment fee."
                );

                return false;

            }


            renderEnrollment(
                data,
                selectedProgram
            );


            return true;


        } catch (error) {

            console.error(
                "NITRIXA: Unexpected enrollment load error:",
                error
            );

            setError(
                "Unable to load secure enrollment details. Please refresh and try again."
            );

            return false;

        }

    }


    /* =====================================================
       RENDER ENROLLMENT
       ===================================================== */

    function renderEnrollment(
        enrollment,
        program
    ) {

        const programType =
            normalizeProgramType(
                program.program_type
            );


        const fee =
            Number(
                enrollment.amount
            );


        /*
         * NAME
         */

        if (programName) {

            programName.textContent =
                program.name ||
                "Selected Program";

        }


        if (summaryProgramName) {

            summaryProgramName.textContent =
                program.name ||
                "Selected Program";

        }


        /*
         * DESCRIPTION
         */

        if (programDescription) {

            programDescription.textContent =
                program.description ||
                "Professional learning and career development program by NITRIXA TECHNOLOGIES.";

        }


        /*
         * PROGRAM TYPE
         */

        if (programTypeBadge) {

            if (
                programType ===
                "TRAINING_AND_INTERNSHIP"
            ) {

                programTypeBadge.textContent =
                    "Training + Internship";

            } else {

                programTypeBadge.textContent =
                    "Internship";

            }

        }


        /*
         * DURATION
         */

        let durationText =
            "-";


        if (
            selectedPath ===
            "training-internship"
        ) {

            const trainingDuration =
                program.training_duration ||
                "-";


            const internshipDuration =
                program.internship_duration ||
                "-";


            durationText =
                `Training: ${trainingDuration} • Internship: ${internshipDuration}`;

        } else {

            durationText =
                program.internship_duration ||
                program.duration ||
                "-";

        }


        if (programDuration) {

            programDuration.textContent =
                durationText;

        }


        /*
         * ENROLLMENT PATH
         */

        const pathLabel =
            formatEnrollmentPath(
                selectedPath
            );


        if (enrollmentPathLabel) {

            enrollmentPathLabel.textContent =
                pathLabel;

        }


        if (summaryEnrollmentPath) {

            summaryEnrollmentPath.textContent =
                pathLabel;

        }


        /*
         * FEE
         */

        const formattedFee =
            formatCurrency(
                fee
            );


        if (summaryProgramFee) {

            summaryProgramFee.textContent =
                formattedFee;

        }


        if (summaryTotal) {

            summaryTotal.textContent =
                formattedFee;

        }

    }


    /* =====================================================
       CHECK SESSION
       ===================================================== */

    async function checkSession() {

        if (
            !window.supabaseClient
        ) {

            currentUser =
                null;

            return false;

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
                    "NITRIXA: Session error:",
                    error
                );

                currentUser =
                    null;

                return false;

            }


            currentUser =
                data &&
                data.session
                    ? data.session.user
                    : null;


            return Boolean(
                currentUser
            );


        } catch (error) {

            console.error(
                "NITRIXA: Session check failed:",
                error
            );

            currentUser =
                null;

            return false;

        }

    }


    /* =====================================================
       UPDATE ACCOUNT UI
       ===================================================== */

    function updateAccountUI(
        isLoggedIn
    ) {

        if (isLoggedIn) {

            hideElement(
                loginRequired
            );

            showElement(
                accountStatus
            );


            if (payNowButton) {

                payNowButton.disabled =
                    false;

            }


            return;

        }


        /*
         * Payment must never be started
         * without an authenticated user.
         */

        hideElement(
            accountStatus
        );

        showElement(
            loginRequired
        );


        if (loginLink) {

            loginLink.href =
                buildLoginUrl();

        }


        if (payNowButton) {

            payNowButton.disabled =
                true;

        }

    }


    /* =====================================================
       WAIT FOR RAZORPAY
       ===================================================== */

    async function waitForRazorpay(
        timeout = 10000
    ) {

        const start =
            Date.now();


        while (
            typeof window.Razorpay !==
            "function"
        ) {

            if (
                Date.now() -
                start >
                timeout
            ) {

                return false;

            }


            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        100
                    );

                }
            );

        }


        return true;

    }


    /* =====================================================
       GET FRESH ACCESS TOKEN
       ===================================================== */

    async function getAccessToken() {

        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {

            return null;

        }


        const {
            data,
            error
        } =
            await window.supabaseClient
                .auth
                .getSession();


        if (error) {

            console.error(
                "NITRIXA: Could not get session:",
                error
            );

            return null;

        }


        if (
            !data ||
            !data.session
        ) {

            return null;

        }


        return data.session.access_token;

    }


    /* =====================================================
       CREATE RAZORPAY ORDER
       ===================================================== */

    async function createRazorpayOrder() {

        if (
            !enrollmentId
        ) {

            throw new Error(
                "Enrollment information is missing."
            );

        }


        const accessToken =
            await getAccessToken();


        if (!accessToken) {

            throw new Error(
                "Your login session has expired. Please login again."
            );

        }


        const supabaseUrl =
            window.supabaseClient.supabaseUrl;


        if (!supabaseUrl) {

            throw new Error(
                "Supabase configuration is unavailable."
            );

        }


        const functionUrl =
            `${supabaseUrl}/functions/v1/create-razorpay-order`;


        console.log(
            "NITRIXA: Creating secure Razorpay order for enrollment:",
            enrollmentId
        );


        const response =
            await fetch(
                functionUrl,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "apikey":
                            window.supabaseClient
                                .supabaseKey

                    },

                    /*
                     * IMPORTANT:
                     *
                     * Do NOT send program fee.
                     * Do NOT send program name.
                     * Do NOT send amount.
                     *
                     * The server-side Edge Function must
                     * resolve the trusted enrollment.
                     */

                    body:
                        JSON.stringify({

                            enrollmentId:
                                enrollmentId

                        })

                }
            );


        let result =
            null;


        try {

            result =
                await response.json();

        } catch {

            throw new Error(
                `Payment service returned an invalid response (${response.status}).`
            );

        }


        console.log(
            "NITRIXA: Payment order response:",
            result
        );


        if (
            !response.ok ||
            !result ||
            !result.success
        ) {

            throw new Error(
                result &&
                result.message

                    ? result.message

                    : `Unable to create payment order (${response.status}).`
            );

        }


        if (!result.orderId) {

            throw new Error(
                "Razorpay order ID was not returned."
            );

        }


        if (!result.keyId) {

            throw new Error(
                "Razorpay checkout key was not returned."
            );

        }


        return result;

    }


    /* =====================================================
       VERIFY RAZORPAY PAYMENT
       ===================================================== */

    async function verifyRazorpayPayment(
        paymentResponse
    ) {

        if (
            !paymentResponse
        ) {

            throw new Error(
                "Razorpay did not return payment information."
            );

        }


        const razorpayOrderId =
            String(
                paymentResponse.razorpay_order_id ||
                ""
            ).trim();


        const razorpayPaymentId =
            String(
                paymentResponse.razorpay_payment_id ||
                ""
            ).trim();


        const razorpaySignature =
            String(
                paymentResponse.razorpay_signature ||
                ""
            ).trim();


        if (
            !razorpayOrderId ||
            !razorpayPaymentId ||
            !razorpaySignature
        ) {

            throw new Error(
                "Required Razorpay verification information is missing."
            );

        }


        const accessToken =
            await getAccessToken();


        if (!accessToken) {

            throw new Error(
                "Your login session has expired. Please login again."
            );

        }


        const supabaseUrl =
            window.supabaseClient.supabaseUrl;


        if (!supabaseUrl) {

            throw new Error(
                "Supabase configuration is unavailable."
            );

        }


        const functionUrl =
            `${supabaseUrl}/functions/v1/verify-razorpay-payment`;


        console.log(
            "NITRIXA: Starting secure payment verification..."
        );


        const response =
            await fetch(
                functionUrl,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "apikey":
                            window.supabaseClient
                                .supabaseKey

                    },

                    body:
                        JSON.stringify({

                            razorpay_order_id:
                                razorpayOrderId,

                            razorpay_payment_id:
                                razorpayPaymentId,

                            razorpay_signature:
                                razorpaySignature

                        })

                }
            );


        let result =
            null;


        try {

            result =
                await response.json();

        } catch {

            throw new Error(
                `Payment verification returned an invalid response (${response.status}).`
            );

        }


        console.log(
            "NITRIXA: Payment verification response:",
            result
        );


        if (
            !response.ok ||
            !result ||
            !result.success
        ) {

            throw new Error(
                result &&
                result.message

                    ? result.message

                    : "Payment verification failed."
            );

        }


        /*
         * The deployed verification function
         * currently returns an Intern ID after
         * successful payment verification.
         */

        if (
            !result.internId
        ) {

            throw new Error(
                "Payment was verified, but an Intern ID was not returned."
            );

        }


        return result;

    }


    /* =====================================================
       REDIRECT TO INTERN DASHBOARD
       ===================================================== */

    function redirectToInternDashboard(
        verificationResult
    ) {

        const params =
            new URLSearchParams();


        if (
            verificationResult &&
            verificationResult.internId
        ) {

            params.set(
                "verified",
                "1"
            );

        }


        if (
            verificationResult &&
            verificationResult.enrollmentId
        ) {

            params.set(
                "enrollment",
                verificationResult.enrollmentId
            );

        }


        const query =
            params.toString();


        const dashboardUrl =
            query
                ? `intern-dashboard.html?${query}`
                : "intern-dashboard.html";


        console.log(
            "NITRIXA: Redirecting to Intern Dashboard:",
            dashboardUrl
        );


        window.location.replace(
            dashboardUrl
        );

    }


    /* =====================================================
       HANDLE SUCCESSFUL PAYMENT
       ===================================================== */

    async function handlePaymentSuccess(
        paymentResponse
    ) {

        try {

            console.log(
                "NITRIXA: Razorpay checkout completed:",
                paymentResponse
            );


            if (payNowButton) {

                payNowButton.disabled =
                    true;

            }


            if (payNowButtonText) {

                payNowButtonText.textContent =
                    "Verifying Payment...";

            }


            showElement(
                paymentProcessing
            );


            const verificationResult =
                await verifyRazorpayPayment(
                    paymentResponse
                );


            console.log(
                "NITRIXA: Payment verified successfully:",
                verificationResult
            );


            if (payNowButtonText) {

                payNowButtonText.textContent =
                    "Payment Verified";

            }


            if (paymentProcessing) {

                paymentProcessing.innerHTML =
                    `
                    <span>
                        ✓ Payment verified. Preparing your Intern Dashboard...
                    </span>
                    `;

            }


            window.setTimeout(
                function () {

                    redirectToInternDashboard(
                        verificationResult
                    );

                },
                700
            );


        } catch (error) {

            console.error(
                "NITRIXA: Payment verification failed:",
                error
            );


            paymentStarting =
                false;


            hideElement(
                paymentProcessing
            );


            if (payNowButton) {

                payNowButton.disabled =
                    false;

            }


            if (payNowButtonText) {

                payNowButtonText.textContent =
                    "Retry Secure Payment";

            }


            alert(
                error &&
                error.message

                    ? error.message

                    : "Payment could not be verified. Please contact NITRIXA TECHNOLOGIES support."
            );

        }

    }


    /* =====================================================
       OPEN RAZORPAY CHECKOUT
       ===================================================== */

    async function openRazorpayCheckout(
        order
    ) {

        const razorpayReady =
            await waitForRazorpay();


        if (!razorpayReady) {

            throw new Error(
                "Razorpay Checkout could not be loaded. Please refresh the page and try again."
            );

        }


        if (!currentUser) {

            throw new Error(
                "Please login before continuing."
            );

        }


        const metadata =
            currentUser.user_metadata ||
            {};


        const email =
            currentUser.email ||
            "";


        const mobile =
            metadata.mobile ||
            metadata.phone ||
            "";


        const options = {

            key:
                order.keyId,

            amount:
                order.amount,

            currency:
                order.currency ||
                "INR",

            name:
                "NITRIXA TECHNOLOGIES",

            description:
                order.programName ||
                selectedProgram.name,

            order_id:
                order.orderId,


            prefill: {

                name:
                    metadata.full_name ||
                    metadata.name ||
                    "",

                email:
                    email,

                contact:
                    mobile

            },


            notes: {

                enrollment_id:
                    enrollmentId,

                program:
                    selectedProgram.name,

                program_slug:
                    selectedProgram.slug,

                enrollment_path:
                    selectedPath

            },


            theme: {

                color:
                    "#3155ff"

            },


            modal: {

                ondismiss:
                    function () {

                        paymentStarting =
                            false;


                        hideElement(
                            paymentProcessing
                        );


                        if (payNowButton) {

                            payNowButton.disabled =
                                false;

                        }


                        if (payNowButtonText) {

                            payNowButtonText.textContent =
                                "Continue to Secure Payment";

                        }

                    }

            },


            handler:
                function (
                    paymentResponse
                ) {

                    /*
                     * Razorpay browser success is NOT
                     * considered final confirmation.
                     *
                     * The payment response is sent to
                     * the secure Supabase Edge Function.
                     *
                     * Server-side verification handles:
                     *
                     * 1. Signature verification
                     * 2. Razorpay order verification
                     * 3. Amount verification
                     * 4. Payment status verification
                     * 5. Payment SUCCESS update
                     * 6. Enrollment activation
                     * 7. Intern ID generation
                     */

                    handlePaymentSuccess(
                        paymentResponse
                    );

                }

        };


        const razorpay =
            new window.Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (response) {

                console.error(
                    "NITRIXA: Razorpay payment failed:",
                    response
                );


                paymentStarting =
                    false;


                hideElement(
                    paymentProcessing
                );


                if (payNowButton) {

                    payNowButton.disabled =
                        false;

                }


                if (payNowButtonText) {

                    payNowButtonText.textContent =
                        "Continue to Secure Payment";

                }


                const description =
                    response &&
                    response.error &&
                    response.error.description

                        ? response.error.description

                        : "The payment could not be completed.";


                alert(
                    `Payment failed.\n\n${description}`
                );

            }
        );


        razorpay.open();

    }


    /* =====================================================
       START PAYMENT
       ===================================================== */

    async function startPayment() {

        if (
            paymentStarting
        ) {

            return;

        }


        if (!currentUser) {

            alert(
                "Please login before continuing."
            );


            if (loginLink) {

                window.location.href =
                    buildLoginUrl();

            } else {

                window.location.href =
                    "login.html";

            }


            return;

        }


        if (!enrollmentId) {

            alert(
                "Enrollment information is not available. Please return to your dashboard and start again."
            );

            return;

        }


        if (!selectedProgram) {

            alert(
                "Program information is not available. Please refresh the page."
            );

            return;

        }


        if (!enrollmentRecord) {

            alert(
                "Enrollment information could not be verified. Please refresh the page."
            );

            return;

        }


        paymentStarting =
            true;


        if (payNowButton) {

            payNowButton.disabled =
                true;

        }


        if (payNowButtonText) {

            payNowButtonText.textContent =
                "Creating Secure Order...";

        }


        showElement(
            paymentProcessing
        );


        try {

            const order =
                await createRazorpayOrder();


            console.log(
                "NITRIXA: Razorpay order created:",
                order
            );


            await openRazorpayCheckout(
                order
            );


        } catch (error) {

            console.error(
                "NITRIXA: Payment start failed:",
                error
            );


            paymentStarting =
                false;


            hideElement(
                paymentProcessing
            );


            if (payNowButton) {

                payNowButton.disabled =
                    false;

            }


            if (payNowButtonText) {

                payNowButtonText.textContent =
                    "Continue to Secure Payment";

            }


            alert(
                error &&
                error.message

                    ? error.message

                    : "Unable to start the payment. Please try again."
            );

        }

    }


    /* =====================================================
       BUTTON EVENT
       ===================================================== */

    function bindEvents() {

        if (!payNowButton) {

            console.error(
                "NITRIXA: Pay Now button not found."
            );

            return;

        }


        payNowButton.addEventListener(
            "click",
            startPayment
        );

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

                    currentUser =
                        session
                            ? session.user
                            : null;


                    if (!currentUser) {

                        updateAccountUI(
                            false
                        );

                        return;

                    }


                    /*
                     * If a user becomes authenticated
                     * while this page is open, refresh
                     * the account UI.
                     */

                    updateAccountUI(
                        true
                    );

                }
            );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        try {

            hideElement(
                errorState
            );

            hideElement(
                checkoutSection
            );

            showElement(
                loadingState
            );


            /*
             * STEP 1
             * Check authentication first.
             */

            const loggedIn =
                await checkSession();


            /*
             * STEP 2
             * Logged-out users should not
             * reach the payment process.
             */

            if (!loggedIn) {

                hideElement(
                    loadingState
                );


                showElement(
                    checkoutSection
                );


                updateAccountUI(
                    false
                );


                return;

            }


            /*
             * STEP 3
             * Load trusted enrollment.
             */

            const enrollmentLoaded =
                await loadEnrollment();


            if (!enrollmentLoaded) {

                return;

            }


            /*
             * STEP 4
             * Account is verified.
             */

            updateAccountUI(
                true
            );


            hideElement(
                loadingState
            );


            showElement(
                checkoutSection
            );


            console.log(
                "NITRIXA: Secure payment page initialized successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Payment initialization failed:",
                error
            );


            setError(
                "Unable to initialize the secure payment page. Please refresh and try again."
            );

        }

    }


    /* =====================================================
       START
       ===================================================== */

    bindEvents();


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            listenForAuthChanges();

            initialize();

        },
        {
            once: true
        }
    );


})();