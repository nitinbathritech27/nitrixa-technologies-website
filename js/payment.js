(function () {
    "use strict";

    const loadingState = document.getElementById("paymentLoadingState");
    const errorState = document.getElementById("paymentErrorState");
    const errorMessage = document.getElementById("paymentErrorMessage");
    const checkoutSection = document.getElementById("paymentCheckout");
    const payNowButton = document.getElementById("payNowButton");
    const payNowButtonText = document.getElementById("payNowButtonText");
    const paymentProcessing = document.getElementById("paymentProcessing");
    const accountStatus = document.getElementById("accountStatus");
    const loginRequired = document.getElementById("loginRequired");
    const loginLink = document.getElementById("loginLink");

    const programName = document.getElementById("programName");
    const programDescription = document.getElementById("programDescription");
    const programTypeBadge = document.getElementById("programTypeBadge");
    const programDuration = document.getElementById("programDuration");
    const enrollmentPathLabel = document.getElementById("enrollmentPathLabel");

    const summaryProgramName = document.getElementById("summaryProgramName");
    const summaryEnrollmentPath = document.getElementById("summaryEnrollmentPath");
    const summaryProgramFee = document.getElementById("summaryProgramFee");
    const summaryTotal = document.getElementById("summaryTotal");

    let enrollmentId = "";
    let enrollmentRecord = null;
    let selectedProgram = null;
    let selectedPath = "";
    let currentUser = null;
    let paymentStarting = false;

    function showElement(element) {
        if (element) element.classList.remove("is-hidden");
    }

    function hideElement(element) {
        if (element) element.classList.add("is-hidden");
    }

    function setError(message) {
        if (errorMessage) {
            errorMessage.textContent = message || "Something went wrong.";
        }

        hideElement(loadingState);
        hideElement(checkoutSection);
        showElement(errorState);
    }

    function formatCurrency(amount) {
        const value = Number(amount);

        if (!Number.isFinite(value)) return "₹0";

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(value);
    }

    function normalizeProgramType(value) {
        return String(value || "").trim().toUpperCase();
    }

    function normalizePath(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getEnrollmentId() {
        const params = new URLSearchParams(window.location.search);
        return (params.get("enrollment") || "").trim();
    }

    function formatEnrollmentPath(path) {
        const normalized = normalizePath(path);

        if (normalized === "training-internship") {
            return "Training + Internship";
        }

        if (normalized === "internship") {
            return "Internship Only";
        }

        return "Enrollment";
    }

    function buildLoginUrl() {
        return "login.html";
    }

    /* =====================================================
       LOAD ENROLLMENT AND SELECTED DURATION
       ===================================================== */

    async function loadEnrollment() {
        enrollmentId = getEnrollmentId();

        if (!enrollmentId) {
            setError(
                "No enrollment was selected. Please return to your dashboard and start the enrollment process again."
            );
            return false;
        }

        if (!window.supabaseClient) {
            setError(
                "Secure database connection is unavailable. Please refresh the page and try again."
            );
            return false;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from("enrollments")
                .select(`
                    id,
                    user_id,
                    program_id,
                    batch_id,
                    enrollment_path,
                    status,
                    amount,
                    duration_id,
                    created_at,
                    program_durations (
                        id,
                        duration_label,
                        fee,
                        description
                    ),
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
                .eq("id", enrollmentId)
                .maybeSingle();

            if (error) {
                console.error("NITRIXA: Enrollment load error:", error);

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

            enrollmentRecord = data;

            if (currentUser && data.user_id !== currentUser.id) {
                setError(
                    "This enrollment does not belong to the current account."
                );
                return false;
            }

            const status = String(data.status || "").trim().toUpperCase();

            if (status === "ACTIVE") {
                setError(
                    "This enrollment is already active. Please open your Intern Dashboard."
                );
                return false;
            }

            if (status === "PAYMENT_VERIFIED") {
                setError(
                    "Payment for this enrollment has already been verified. Please open your Intern Dashboard."
                );
                return false;
            }

            if (status !== "PENDING_PAYMENT") {
                setError(
                    "This enrollment is not currently available for payment."
                );
                return false;
            }

            if (!data.programs) {
                setError(
                    "The program connected to this enrollment could not be found."
                );
                return false;
            }

            selectedProgram = data.programs;

            const programStatus = String(
                selectedProgram.status || ""
            ).trim().toUpperCase();

            if (programStatus !== "ACTIVE") {
                setError(
                    "This program is no longer available for enrollment."
                );
                return false;
            }

            selectedPath = normalizePath(data.enrollment_path);

            if (
                selectedPath !== "internship" &&
                selectedPath !== "training-internship"
            ) {
                setError("This enrollment has an invalid enrollment path.");
                return false;
            }

            const type = normalizeProgramType(
                selectedProgram.program_type
            );

            if (
                selectedPath === "internship" &&
                type !== "INTERNSHIP"
            ) {
                setError(
                    "This enrollment path is not valid for the selected program."
                );
                return false;
            }

            if (
                selectedPath === "training-internship" &&
                type !== "TRAINING_AND_INTERNSHIP"
            ) {
                setError(
                    "This enrollment path is not valid for the selected program."
                );
                return false;
            }

            /*
             * The enrollment amount is the trusted checkout amount.
             * Do not validate it against programs.fee because a selected
             * duration can have a different fee from the base program.
             */
            const amount = Number(data.amount);

            if (!Number.isFinite(amount) || amount <= 0) {
                setError(
                    "This enrollment does not have a valid payment amount."
                );
                return false;
            }

            renderEnrollment(data, selectedProgram);
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
       DISPLAY PROGRAM, DURATION AND SAVED ENROLLMENT FEE
       ===================================================== */

    function renderEnrollment(enrollment, program) {
        const type = normalizeProgramType(program.program_type);
        const fee = Number(enrollment.amount);

        if (programName) {
            programName.textContent = program.name || "Selected Program";
        }

        if (summaryProgramName) {
            summaryProgramName.textContent = program.name || "Selected Program";
        }

        if (programDescription) {
            programDescription.textContent =
                program.description ||
                "Professional learning and career development program by NITRIXA TECHNOLOGIES.";
        }

        if (programTypeBadge) {
            programTypeBadge.textContent =
                type === "TRAINING_AND_INTERNSHIP"
                    ? "Training + Internship"
                    : "Internship";
        }

        /*
         * Supabase may return a related record as an object or an array.
         * Prefer the duration selected and saved on this enrollment.
         */
        const relation = enrollment.program_durations;

        const duration = Array.isArray(relation)
            ? relation[0]
            : relation;

        let durationText = duration?.duration_label || "";

        /*
         * Backward compatibility for enrollments created before
         * duration_id was added.
         */
        if (!durationText) {
            if (selectedPath === "training-internship") {
                const trainingDuration = program.training_duration || "-";
                const internshipDuration = program.internship_duration || "-";

                durationText =
                    `Training: ${trainingDuration} • Internship: ${internshipDuration}`;
            } else {
                durationText =
                    program.internship_duration ||
                    program.duration ||
                    "-";
            }
        }

        if (programDuration) {
            programDuration.textContent = durationText;
        }

        const pathLabel = formatEnrollmentPath(selectedPath);

        if (enrollmentPathLabel) {
            enrollmentPathLabel.textContent = pathLabel;
        }

        if (summaryEnrollmentPath) {
            summaryEnrollmentPath.textContent = pathLabel;
        }

        const formattedFee = formatCurrency(fee);

        if (summaryProgramFee) {
            summaryProgramFee.textContent = formattedFee;
        }

        if (summaryTotal) {
            summaryTotal.textContent = formattedFee;
        }
    }

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    async function checkSession() {
        if (!window.supabaseClient) {
            currentUser = null;
            return false;
        }

        try {
            const { data, error } =
                await window.supabaseClient.auth.getSession();

            if (error) {
                console.error("NITRIXA: Session error:", error);
                currentUser = null;
                return false;
            }

            currentUser = data?.session?.user || null;
            return Boolean(currentUser);

        } catch (error) {
            console.error("NITRIXA: Session check failed:", error);
            currentUser = null;
            return false;
        }
    }

    function updateAccountUI(isLoggedIn) {
        if (isLoggedIn) {
            hideElement(loginRequired);
            showElement(accountStatus);

            if (payNowButton) {
                payNowButton.disabled = false;
            }

            return;
        }

        hideElement(accountStatus);
        showElement(loginRequired);

        if (loginLink) {
            loginLink.href = buildLoginUrl();
        }

        if (payNowButton) {
            payNowButton.disabled = true;
        }
    }

    function listenForAuthChanges() {
        if (!window.supabaseClient?.auth) return;

        window.supabaseClient.auth.onAuthStateChange(
            function (event, session) {
                currentUser = session?.user || null;
                updateAccountUI(Boolean(currentUser));
            }
        );
    }

    async function getAccessToken() {
        if (!window.supabaseClient?.auth) {
            return null;
        }

        const { data, error } =
            await window.supabaseClient.auth.getSession();

        if (error) {
            console.error("NITRIXA: Could not get session:", error);
            return null;
        }

        return data?.session?.access_token || null;
    }

    /* =====================================================
       RAZORPAY ORDER CREATION
       ===================================================== */

    async function createRazorpayOrder() {
        if (!enrollmentId) {
            throw new Error("Enrollment information is missing.");
        }

        const accessToken = await getAccessToken();

        if (!accessToken) {
            throw new Error(
                "Your login session has expired. Please login again."
            );
        }

        const supabaseUrl = window.supabaseClient.supabaseUrl;

        if (!supabaseUrl) {
            throw new Error("Supabase configuration is unavailable.");
        }

        const response = await fetch(
            `${supabaseUrl}/functions/v1/create-razorpay-order`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "apikey": window.supabaseClient.supabaseKey
                },
                /*
                 * Never send a browser-controlled fee.
                 * The Edge Function must resolve the amount from enrollment.
                 */
                body: JSON.stringify({
                    enrollmentId: enrollmentId
                })
            }
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                `Payment service returned an invalid response (${response.status}).`
            );
        }

        console.log("NITRIXA: Payment order response:", result);

        if (!response.ok || !result?.success) {
            throw new Error(
                result?.message ||
                `Unable to create payment order (${response.status}).`
            );
        }

        if (!result.orderId) {
            throw new Error("Razorpay order ID was not returned.");
        }

        if (!result.keyId) {
            throw new Error("Razorpay checkout key was not returned.");
        }

        return result;
    }

    /* =====================================================
       SERVER-SIDE PAYMENT VERIFICATION
       ===================================================== */

    async function verifyRazorpayPayment(paymentResponse) {
        if (!paymentResponse) {
            throw new Error(
                "Razorpay did not return payment information."
            );
        }

        const razorpayOrderId = String(
            paymentResponse.razorpay_order_id || ""
        ).trim();

        const razorpayPaymentId = String(
            paymentResponse.razorpay_payment_id || ""
        ).trim();

        const razorpaySignature = String(
            paymentResponse.razorpay_signature || ""
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

        const accessToken = await getAccessToken();

        if (!accessToken) {
            throw new Error(
                "Your login session has expired. Please login again."
            );
        }

        const supabaseUrl = window.supabaseClient.supabaseUrl;

        if (!supabaseUrl) {
            throw new Error("Supabase configuration is unavailable.");
        }

        const response = await fetch(
            `${supabaseUrl}/functions/v1/verify-razorpay-payment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "apikey": window.supabaseClient.supabaseKey
                },
                body: JSON.stringify({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_signature: razorpaySignature
                })
            }
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                `Payment verification returned an invalid response (${response.status}).`
            );
        }

        console.log(
            "NITRIXA: Payment verification response:",
            result
        );

        if (!response.ok || !result?.success) {
            throw new Error(
                result?.message || "Payment verification failed."
            );
        }

        if (!result.internId) {
            throw new Error(
                "Payment was verified, but an Intern ID was not returned."
            );
        }

        return result;
    }

    /* =====================================================
       DASHBOARD REDIRECT
       ===================================================== */

    function redirectToInternDashboard(verificationResult) {
        const params = new URLSearchParams();

        if (verificationResult?.internId) {
            params.set("verified", "1");
        }

        if (verificationResult?.enrollmentId) {
            params.set("enrollment", verificationResult.enrollmentId);
        }

        const query = params.toString();

        const dashboardUrl = query
            ? `intern-dashboard.html?${query}`
            : "intern-dashboard.html";

        window.location.replace(dashboardUrl);
    }

    /* =====================================================
       PAYMENT SUCCESS
       ===================================================== */

    async function handlePaymentSuccess(paymentResponse) {
        try {
            console.log(
                "NITRIXA: Razorpay checkout completed:",
                paymentResponse
            );

            if (payNowButton) {
                payNowButton.disabled = true;
            }

            if (payNowButtonText) {
                payNowButtonText.textContent = "Verifying Payment...";
            }

            showElement(paymentProcessing);

            const result =
                await verifyRazorpayPayment(paymentResponse);

            console.log(
                "NITRIXA: Payment verified successfully:",
                result
            );

            if (payNowButtonText) {
                payNowButtonText.textContent = "Payment Verified";
            }

            if (paymentProcessing) {
                paymentProcessing.innerHTML = `
                    <span>
                        ✓ Payment verified. Preparing your Intern Dashboard...
                    </span>
                `;
            }

            window.setTimeout(function () {
                redirectToInternDashboard(result);
            }, 700);

        } catch (error) {
            console.error(
                "NITRIXA: Payment verification failed:",
                error
            );

            paymentStarting = false;
            hideElement(paymentProcessing);

            if (payNowButton) {
                payNowButton.disabled = false;
            }

            if (payNowButtonText) {
                payNowButtonText.textContent = "Retry Secure Payment";
            }

            alert(
                error?.message ||
                "Payment could not be verified. Please contact NITRIXA TECHNOLOGIES support."
            );
        }
    }

    /* =====================================================
       RAZORPAY CHECKOUT
       ===================================================== */

    async function waitForRazorpay(timeout = 10000) {
        const start = Date.now();

        while (typeof window.Razorpay !== "function") {
            if (Date.now() - start > timeout) {
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return true;
    }

    async function openRazorpayCheckout(order) {
        const ready = await waitForRazorpay();

        if (!ready) {
            throw new Error(
                "Razorpay Checkout could not be loaded. Please refresh the page and try again."
            );
        }

        if (!currentUser) {
            throw new Error("Please login before continuing.");
        }

        const metadata = currentUser.user_metadata || {};
        const email = currentUser.email || "";
        const mobile = metadata.mobile || metadata.phone || "";

        const options = {
            key: order.keyId,
            amount: order.amount,
            currency: order.currency || "INR",
            name: "NITRIXA TECHNOLOGIES",
            description: order.programName || selectedProgram.name,
            order_id: order.orderId,

            prefill: {
                name: metadata.full_name || metadata.name || "",
                email: email,
                contact: mobile
            },

            notes: {
                enrollment_id: enrollmentId,
                program: selectedProgram.name,
                program_slug: selectedProgram.slug,
                enrollment_path: selectedPath
            },

            theme: {
                color: "#3155ff"
            },

            modal: {
                ondismiss: function () {
                    paymentStarting = false;
                    hideElement(paymentProcessing);

                    if (payNowButton) {
                        payNowButton.disabled = false;
                    }

                    if (payNowButtonText) {
                        payNowButtonText.textContent =
                            "Continue to Secure Payment";
                    }
                }
            },

            handler: function (paymentResponse) {
                handlePaymentSuccess(paymentResponse);
            }
        };

        const razorpay = new window.Razorpay(options);

        razorpay.on("payment.failed", function (response) {
            console.error("NITRIXA: Razorpay payment failed:", response);

            paymentStarting = false;
            hideElement(paymentProcessing);

            if (payNowButton) {
                payNowButton.disabled = false;
            }

            if (payNowButtonText) {
                payNowButtonText.textContent =
                    "Continue to Secure Payment";
            }

            const description =
                response?.error?.description ||
                "The payment could not be completed.";

            alert(`Payment failed.\n\n${description}`);
        });

        razorpay.open();
    }

    /* =====================================================
       START PAYMENT
       ===================================================== */

    async function startPayment() {
        if (paymentStarting) return;

        if (!currentUser) {
            alert("Please login before continuing.");
            window.location.href = buildLoginUrl();
            return;
        }

        if (!enrollmentId || !selectedProgram || !enrollmentRecord) {
            alert(
                "Enrollment information could not be verified. Please refresh the page."
            );
            return;
        }

        paymentStarting = true;

        if (payNowButton) {
            payNowButton.disabled = true;
        }

        if (payNowButtonText) {
            payNowButtonText.textContent = "Creating Secure Order...";
        }

        showElement(paymentProcessing);

        try {
            const order = await createRazorpayOrder();

            console.log("NITRIXA: Razorpay order created:", order);

            await openRazorpayCheckout(order);

        } catch (error) {
            console.error("NITRIXA: Payment start failed:", error);

            paymentStarting = false;
            hideElement(paymentProcessing);

            if (payNowButton) {
                payNowButton.disabled = false;
            }

            if (payNowButtonText) {
                payNowButtonText.textContent =
                    "Continue to Secure Payment";
            }

            alert(
                error?.message ||
                "Unable to start the payment. Please try again."
            );
        }
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function bindEvents() {
        if (!payNowButton) {
            console.error("NITRIXA: Pay Now button not found.");
            return;
        }

        payNowButton.addEventListener("click", startPayment);
    }

    async function initialize() {
        try {
            hideElement(errorState);
            hideElement(checkoutSection);
            showElement(loadingState);

            const loggedIn = await checkSession();

            if (!loggedIn) {
                hideElement(loadingState);
                showElement(checkoutSection);
                updateAccountUI(false);
                return;
            }

            const loaded = await loadEnrollment();

            if (!loaded) {
                return;
            }

            updateAccountUI(true);
            hideElement(loadingState);
            showElement(checkoutSection);

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

    bindEvents();

    function startPaymentPage() {
        listenForAuthChanges();
        initialize();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startPaymentPage,
            { once: true }
        );
    } else {
        startPaymentPage();
    }
})();