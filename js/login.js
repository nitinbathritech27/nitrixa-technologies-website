/*
=========================================================
NITRIXA TECHNOLOGIES
PUBLIC LOGIN / REGISTRATION

AUTHENTICATION FLOW

REGISTER
    ↓
Supabase signUp()
    ↓
NITRIXA branded OTP email
    ↓
6-digit OTP
    ↓
supabase.auth.verifyOtp()
    ↓
Email verified
    ↓
Intern Dashboard / Admin Dashboard

LOGIN
    ↓
Email + Password
    ↓
Supabase signInWithPassword()
    ↓
Check Admin
    ↓
Admin Dashboard / Intern Dashboard

IMPORTANT

- Registration creates account only.
- Registration does NOT create enrollment.
- Registration does NOT create payment.
- Registration does NOT create Intern ID.
- OTP is required only for registration email verification.
- Login does NOT require OTP.
- Intern ID is created only after verified payment.
=========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        "use strict";


        /* =====================================================
           ELEMENTS
        ===================================================== */

        const loginTab =
            document.getElementById(
                "loginTab"
            );

        const registerTab =
            document.getElementById(
                "registerTab"
            );

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const registerForm =
            document.getElementById(
                "registerForm"
            );

        const switchToRegister =
            document.getElementById(
                "switchToRegister"
            );

        const switchToLogin =
            document.getElementById(
                "switchToLogin"
            );

        const forgotPasswordButton =
            document.getElementById(
                "forgotPasswordButton"
            );

        const backToLoginButton =
            document.getElementById(
                "backToLoginButton"
            );

        const confirmationPanel =
            document.getElementById(
                "confirmationPanel"
            );

        const authMessage =
            document.getElementById(
                "authMessage"
            );

        const authTitle =
            document.getElementById(
                "authTitle"
            );

        const authSubtitle =
            document.getElementById(
                "authSubtitle"
            );

        const otpInput =
            document.getElementById(
                "otpInput"
            );

        const otpEmailDisplay =
            document.getElementById(
                "otpEmailDisplay"
            );

        const verifyOtpButton =
            document.getElementById(
                "verifyOtpButton"
            );

        const resendOtpButton =
            document.getElementById(
                "resendOtpButton"
            );

        const otpStatus =
            document.getElementById(
                "otpStatus"
            );


        /* =====================================================
           SUPABASE CHECK
        ===================================================== */

        if (
            !window.supabaseClient ||
            !window.supabaseClient.auth
        ) {

            console.error(
                "NITRIXA: Supabase client is unavailable."
            );

            if (authMessage) {

                authMessage.textContent =
                    "Authentication service is currently unavailable. Please refresh the page and try again.";

                authMessage.className =
                    "auth-message error";

                authMessage.hidden =
                    false;
            }

            return;
        }


        const supabase =
            window.supabaseClient;


        /* =====================================================
           STATE
        ===================================================== */

        let pendingOtpEmail =
            "";

        let pendingOtpPassword =
            "";

        let resendTimer = null;

        let resendSeconds = 0;


        /* =====================================================
           MESSAGE
        ===================================================== */

        function showMessage(
            message,
            type = "info"
        ) {

            if (!authMessage) {
                return;
            }

            authMessage.textContent =
                message || "";

            authMessage.className =
                `auth-message ${type}`;

            authMessage.hidden =
                false;
        }


        function clearMessage() {

            if (!authMessage) {
                return;
            }

            authMessage.textContent =
                "";

            authMessage.className =
                "auth-message";

            authMessage.hidden =
                true;
        }


        /* =====================================================
           BUTTON LOADING
        ===================================================== */

        function setButtonLoading(
            button,
            loading,
            loadingText
        ) {

            if (!button) {
                return;
            }

            const textElement =
                button.querySelector(
                    ".auth-button-text"
                );

            if (
                !button.dataset.defaultText
            ) {

                button.dataset.defaultText =
                    textElement
                        ? textElement.textContent
                        : button.textContent.trim();
            }

            button.disabled =
                loading;

            button.classList.toggle(
                "loading",
                loading
            );

            if (textElement) {

                textElement.textContent =
                    loading
                        ? loadingText
                        : button.dataset.defaultText;
            }
        }


        /* =====================================================
           MODE SWITCH
        ===================================================== */

        function setMode(
            mode
        ) {

            clearMessage();

            const isLogin =
                mode === "login";


            if (loginForm) {

                loginForm.classList.toggle(
                    "is-hidden",
                    !isLogin
                );
            }


            if (registerForm) {

                registerForm.classList.toggle(
                    "is-hidden",
                    isLogin
                );
            }


            if (confirmationPanel) {

                confirmationPanel.classList.add(
                    "is-hidden"
                );
            }


            if (loginTab) {

                loginTab.classList.toggle(
                    "active",
                    isLogin
                );

                loginTab.setAttribute(
                    "aria-selected",
                    String(isLogin)
                );
            }


            if (registerTab) {

                registerTab.classList.toggle(
                    "active",
                    !isLogin
                );

                registerTab.setAttribute(
                    "aria-selected",
                    String(!isLogin)
                );
            }


            if (isLogin) {

                if (authTitle) {

                    authTitle.textContent =
                        "Welcome back";
                }

                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Sign in to continue with your enrollment.";
                }

            } else {

                if (authTitle) {

                    authTitle.textContent =
                        "Create your account";
                }

                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Register once and access your NITRIXA Intern Dashboard.";
                }
            }
        }


        /* =====================================================
           OTP PANEL
        ===================================================== */

        function showOtpPanel(
            email
        ) {

            pendingOtpEmail =
                String(
                    email || ""
                )
                    .trim()
                    .toLowerCase();


            if (loginForm) {

                loginForm.classList.add(
                    "is-hidden"
                );
            }


            if (registerForm) {

                registerForm.classList.add(
                    "is-hidden"
                );
            }


            if (confirmationPanel) {

                confirmationPanel.classList.remove(
                    "is-hidden"
                );
            }


            if (loginTab) {

                loginTab.classList.remove(
                    "active"
                );

                loginTab.setAttribute(
                    "aria-selected",
                    "false"
                );
            }


            if (registerTab) {

                registerTab.classList.remove(
                    "active"
                );

                registerTab.setAttribute(
                    "aria-selected",
                    "false"
                );
            }


            if (authTitle) {

                authTitle.textContent =
                    "Verify your email";
            }


            if (authSubtitle) {

                authSubtitle.textContent =
                    "Enter the verification code sent to your email.";
            }


            if (otpEmailDisplay) {

                otpEmailDisplay.textContent =
                    pendingOtpEmail;
            }


            if (otpInput) {

                otpInput.value =
                    "";

                otpInput.focus();
            }


            if (otpStatus) {

                otpStatus.textContent =
                    "A 6-digit verification code has been sent to your email.";
            }


            clearMessage();

            startResendTimer();
        }


        function hideOtpPanel() {

            if (confirmationPanel) {

                confirmationPanel.classList.add(
                    "is-hidden"
                );
            }

            pendingOtpEmail =
                "";

            pendingOtpPassword =
                "";

            stopResendTimer();

            setMode(
                "login"
            );
        }


        /* =====================================================
           OTP INPUT
        ===================================================== */

        if (otpInput) {

            otpInput.addEventListener(
                "input",
                () => {

                    otpInput.value =
                        otpInput.value
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                6
                            );
                }
            );


            otpInput.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        if (
                            verifyOtpButton &&
                            !verifyOtpButton.disabled
                        ) {

                            verifyOtpButton.click();
                        }
                    }
                }
            );
        }


        /* =====================================================
           RESEND TIMER
        ===================================================== */

        function startResendTimer() {

            stopResendTimer();

            resendSeconds =
                60;

            updateResendButton();

            resendTimer =
                window.setInterval(
                    () => {

                        resendSeconds--;

                        updateResendButton();

                        if (
                            resendSeconds <= 0
                        ) {

                            stopResendTimer();
                        }

                    },
                    1000
                );
        }


        function stopResendTimer() {

            if (resendTimer) {

                window.clearInterval(
                    resendTimer
                );

                resendTimer =
                    null;
            }

            resendSeconds =
                0;

            updateResendButton();
        }


        function updateResendButton() {

            if (!resendOtpButton) {
                return;
            }

            if (
                resendSeconds > 0
            ) {

                resendOtpButton.disabled =
                    true;

                resendOtpButton.textContent =
                    `Resend OTP in ${resendSeconds}s`;

            } else {

                resendOtpButton.disabled =
                    false;

                resendOtpButton.textContent =
                    "Resend OTP";
            }
        }


        /* =====================================================
           VALIDATION HELPERS
        ===================================================== */

        function normalizeEmail(
            value
        ) {

            return String(
                value || ""
            )
                .trim()
                .replace(
                    /^['"]+|['"]+$/g,
                    ""
                )
                .toLowerCase();
        }


        function normalizeMobile(
            value
        ) {

            return String(
                value || ""
            )
                .trim()
                .replace(
                    /[\s()-]/g,
                    ""
                );
        }


        function isValidEmail(
            email
        ) {

            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
                email
            );
        }


        function isValidMobile(
            mobile
        ) {

            return /^\+?[0-9]{10,15}$/.test(
                mobile
            );
        }


        function clearInputErrors(
            form
        ) {

            if (!form) {
                return;
            }

            form
                .querySelectorAll(
                    ".input-error"
                )
                .forEach(
                    input => {

                        input.classList.remove(
                            "input-error"
                        );
                    }
                );
        }


        function markInputError(
            input
        ) {

            if (!input) {
                return;
            }

            input.classList.add(
                "input-error"
            );

            input.focus();
        }


        /* =====================================================
           ERROR MESSAGE HELPERS
        ===================================================== */

        function getRegistrationErrorMessage(
            error
        ) {

            const errorText =
                String(
                    error?.message || ""
                )
                    .toLowerCase();


            if (
                errorText.includes(
                    "already registered"
                ) ||
                errorText.includes(
                    "user already registered"
                )
            ) {

                return (
                    "An account with this email already exists. Please login instead."
                );
            }


            if (
                errorText.includes(
                    "invalid email"
                )
            ) {

                return (
                    "Please enter a valid email address."
                );
            }


            if (
                errorText.includes(
                    "password"
                ) &&
                (
                    errorText.includes(
                        "at least"
                    ) ||
                    errorText.includes(
                        "short"
                    ) ||
                    errorText.includes(
                        "weak"
                    )
                )
            ) {

                return (
                    "Your password does not meet the required security rules."
                );
            }


            if (
                errorText.includes(
                    "rate limit"
                ) ||
                errorText.includes(
                    "too many requests"
                )
            ) {

                return (
                    "Too many attempts were made. Please wait a few minutes and try again."
                );
            }


            if (
                errorText.includes(
                    "signup"
                ) &&
                errorText.includes(
                    "disabled"
                )
            ) {

                return (
                    "New account registration is currently disabled."
                );
            }


            return (
                "We could not create your account. Please check your details and try again."
            );
        }


        function getOtpErrorMessage(
            error
        ) {

            const errorText =
                String(
                    error?.message || ""
                )
                    .toLowerCase();


            if (
                errorText.includes(
                    "expired"
                )
            ) {

                return (
                    "This OTP has expired. Please request a new OTP."
                );
            }


            if (
                errorText.includes(
                    "invalid"
                ) ||
                errorText.includes(
                    "token"
                )
            ) {

                return (
                    "The verification code is incorrect or invalid. Please check the code and try again."
                );
            }


            if (
                errorText.includes(
                    "rate limit"
                ) ||
                errorText.includes(
                    "too many"
                )
            ) {

                return (
                    "Too many verification attempts were made. Please wait and try again."
                );
            }


            return (
                "We could not verify this code. Please check the OTP and try again."
            );
        }


        /* =====================================================
           DASHBOARD REDIRECT
        ===================================================== */

        function redirectToDashboard(
            message
        ) {

            showMessage(
                message ||
                "Login successful. Opening your Intern Dashboard...",
                "success"
            );


            window.setTimeout(
                () => {

                    window.location.href =
                        "intern-dashboard.html";

                },
                500
            );
        }


        function redirectToAdminDashboard() {

            showMessage(
                "Admin login successful. Opening Admin Dashboard...",
                "success"
            );


            window.setTimeout(
                () => {

                    window.location.href =
                        "admin/dashboard.html";

                },
                500
            );
        }


        /* =====================================================
           ADMIN ACCESS CHECK
        ===================================================== */

        async function isCurrentUserAdmin() {

            try {

                const {
                    data,
                    error
                } =
                    await supabase.rpc(
                        "is_admin"
                    );


                if (error) {

                    console.error(
                        "NITRIXA: Admin access check failed:",
                        error
                    );

                    return false;
                }


                return (
                    data === true
                );

            } catch (
                error
            ) {

                console.error(
                    "NITRIXA: Admin access check exception:",
                    error
                );

                return false;
            }
        }


        /* =====================================================
           LOGIN
        ===================================================== */

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    clearMessage();

                    clearInputErrors(
                        loginForm
                    );


                    const emailInput =
                        document.getElementById(
                            "loginEmail"
                        );

                    const passwordInput =
                        document.getElementById(
                            "loginPassword"
                        );

                    const button =
                        document.getElementById(
                            "loginButton"
                        );


                    if (
                        !emailInput ||
                        !passwordInput
                    ) {

                        showMessage(
                            "Login form is incomplete. Please refresh the page and try again.",
                            "error"
                        );

                        return;
                    }


                    const email =
                        normalizeEmail(
                            emailInput.value
                        );

                    const password =
                        passwordInput.value;


                    emailInput.value =
                        email;


                    if (
                        !isValidEmail(
                            email
                        )
                    ) {

                        markInputError(
                            emailInput
                        );

                        showMessage(
                            "Please enter a valid email address.",
                            "error"
                        );

                        return;
                    }


                    if (
                        !password
                    ) {

                        markInputError(
                            passwordInput
                        );

                        showMessage(
                            "Please enter your password.",
                            "error"
                        );

                        return;
                    }


                    setButtonLoading(
                        button,
                        true,
                        "Signing In..."
                    );


                    try {

                        const {
                            data,
                            error
                        } =
                            await supabase.auth
                                .signInWithPassword({
                                    email,
                                    password
                                });


                        if (error) {

                            console.error(
                                "NITRIXA login error:",
                                error
                            );


                            const errorText =
                                String(
                                    error.message || ""
                                )
                                    .toLowerCase();


                            if (
                                errorText.includes(
                                    "email not confirmed"
                                )
                            ) {

                                showMessage(
                                    "Your email is not verified yet. Please complete the OTP verification before logging in.",
                                    "error"
                                );

                                return;
                            }


                            if (
                                errorText.includes(
                                    "invalid login credentials"
                                )
                            ) {

                                showMessage(
                                    "Incorrect email or password. Please check your details and try again.",
                                    "error"
                                );

                                return;
                            }


                            showMessage(
                                "Login failed. Please check your email and password and try again.",
                                "error"
                            );

                            return;
                        }


                        if (
                            !data ||
                            !data.session ||
                            !data.user
                        ) {

                            showMessage(
                                "Login completed, but no active session was created. Please try again.",
                                "error"
                            );

                            return;
                        }


                        /* -------------------------------------
                           ADMIN CHECK
                        ------------------------------------- */

                        const isAdmin =
                            await isCurrentUserAdmin();


                        if (
                            isAdmin
                        ) {

                            redirectToAdminDashboard();

                            return;
                        }


                        /* -------------------------------------
                           NORMAL USER
                        ------------------------------------- */

                        redirectToDashboard(
                            "Login successful. Opening your Intern Dashboard..."
                        );


                    } catch (
                        error
                    ) {

                        console.error(
                            "NITRIXA unexpected login error:",
                            error
                        );

                        showMessage(
                            "Something went wrong while signing in. Please try again.",
                            "error"
                        );

                    } finally {

                        setButtonLoading(
                            button,
                            false,
                            "Signing In..."
                        );
                    }

                }
            );
        }


        /* =====================================================
           REGISTRATION
        ===================================================== */

        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    clearMessage();

                    clearInputErrors(
                        registerForm
                    );


                    const nameInput =
                        document.getElementById(
                            "registerName"
                        );

                    const emailInput =
                        document.getElementById(
                            "registerEmail"
                        );

                    const mobileInput =
                        document.getElementById(
                            "registerMobile"
                        );

                    const passwordInput =
                        document.getElementById(
                            "registerPassword"
                        );

                    const confirmPasswordInput =
                        document.getElementById(
                            "registerConfirmPassword"
                        );

                    const consentInput =
                        document.getElementById(
                            "registerConsent"
                        );

                    const button =
                        document.getElementById(
                            "registerButton"
                        );


                    if (
                        !nameInput ||
                        !emailInput ||
                        !mobileInput ||
                        !passwordInput ||
                        !confirmPasswordInput ||
                        !consentInput
                    ) {

                        showMessage(
                            "Registration form is incomplete. Please refresh the page and try again.",
                            "error"
                        );

                        return;
                    }


                    const fullName =
                        nameInput.value.trim();

                    const email =
                        normalizeEmail(
                            emailInput.value
                        );

                    const mobile =
                        normalizeMobile(
                            mobileInput.value
                        );

                    const password =
                        passwordInput.value;

                    const confirmPassword =
                        confirmPasswordInput.value;


                    emailInput.value =
                        email;

                    mobileInput.value =
                        mobile;


                    /* -----------------------------------------
                       NAME
                    ----------------------------------------- */

                    if (
                        fullName.length < 2
                    ) {

                        markInputError(
                            nameInput
                        );

                        showMessage(
                            "Please enter your full name.",
                            "error"
                        );

                        return;
                    }


                    /* -----------------------------------------
                       EMAIL
                    ----------------------------------------- */

                    if (
                        !isValidEmail(
                            email
                        )
                    ) {

                        markInputError(
                            emailInput
                        );

                        showMessage(
                            "Please enter a valid email address, for example: name@gmail.com",
                            "error"
                        );

                        return;
                    }


                    /* -----------------------------------------
                       MOBILE
                    ----------------------------------------- */

                    if (
                        !isValidMobile(
                            mobile
                        )
                    ) {

                        markInputError(
                            mobileInput
                        );

                        showMessage(
                            "Please enter a valid mobile number.",
                            "error"
                        );

                        return;
                    }


                    /* -----------------------------------------
                       PASSWORD
                    ----------------------------------------- */

                    if (
                        password.length < 8
                    ) {

                        markInputError(
                            passwordInput
                        );

                        showMessage(
                            "Password must contain at least 8 characters.",
                            "error"
                        );

                        return;
                    }


                    /* -----------------------------------------
                       CONFIRM PASSWORD
                    ----------------------------------------- */

                    if (
                        password !==
                        confirmPassword
                    ) {

                        markInputError(
                            confirmPasswordInput
                        );

                        showMessage(
                            "Passwords do not match.",
                            "error"
                        );

                        return;
                    }


                    /* -----------------------------------------
                       CONSENT
                    ----------------------------------------- */

                    if (
                        !consentInput.checked
                    ) {

                        showMessage(
                            "Please accept the Terms and Privacy Policy to create your account.",
                            "error"
                        );

                        return;
                    }


                    setButtonLoading(
                        button,
                        true,
                        "Creating Account..."
                    );


                    try {

                        console.log(
                            "NITRIXA: Creating account:",
                            email
                        );


                        /*
                         * Registration creates the account.
                         *
                         * It does NOT:
                         * - create enrollment
                         * - create payment
                         * - create Intern ID
                         */


                        const {
                            data,
                            error
                        } =
                            await supabase.auth
                                .signUp({
                                    email,
                                    password,

                                    options: {

                                        data: {

                                            full_name:
                                                fullName,

                                            mobile:
                                                mobile

                                        }
                                    }
                                });


                        if (error) {

                            console.error(
                                "NITRIXA registration error:",
                                error
                            );

                            showMessage(
                                getRegistrationErrorMessage(
                                    error
                                ),
                                "error"
                            );

                            return;
                        }


                        /*
                         * If email confirmation is disabled
                         * Supabase may return an active session.
                         *
                         * Our intended production configuration
                         * requires email verification.
                         */

                        if (
                            data &&
                            data.session &&
                            data.user
                        ) {

                            const isAdmin =
                                await isCurrentUserAdmin();


                            if (
                                isAdmin
                            ) {

                                redirectToAdminDashboard();

                            } else {

                                redirectToDashboard(
                                    "Account created successfully. Opening your Intern Dashboard..."
                                );
                            }

                            return;
                        }


                        /*
                         * Email verification is required.
                         *
                         * Supabase has sent the OTP email.
                         */

                        pendingOtpEmail =
                            email;

                        pendingOtpPassword =
                            password;


                        showOtpPanel(
                            email
                        );


                        showMessage(
                            "Your account was created. Enter the 6-digit OTP sent to your email.",
                            "success"
                        );


                    } catch (
                        error
                    ) {

                        console.error(
                            "NITRIXA unexpected registration error:",
                            error
                        );

                        showMessage(
                            "Something went wrong while creating your account. Please try again.",
                            "error"
                        );

                    } finally {

                        setButtonLoading(
                            button,
                            false,
                            "Creating Account..."
                        );
                    }

                }
            );
        }


        /* =====================================================
           VERIFY OTP
        ===================================================== */

        if (verifyOtpButton) {

            verifyOtpButton.addEventListener(
                "click",
                async () => {

                    clearMessage();


                    const otp =
                        String(
                            otpInput
                                ? otpInput.value
                                : ""
                        )
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                6
                            );


                    if (
                        !pendingOtpEmail
                    ) {

                        showMessage(
                            "Your verification session has expired. Please register again.",
                            "error"
                        );

                        return;
                    }


                    if (
                        !/^\d{6}$/.test(
                            otp
                        )
                    ) {

                        if (otpInput) {

                            markInputError(
                                otpInput
                            );
                        }

                        showMessage(
                            "Please enter the 6-digit verification code sent to your email.",
                            "error"
                        );

                        return;
                    }


                    setButtonLoading(
                        verifyOtpButton,
                        true,
                        "Verifying..."
                    );


                    try {

                        console.log(
                            "NITRIXA: Verifying OTP for:",
                            pendingOtpEmail
                        );


                        const {
                            data,
                            error
                        } =
                            await supabase.auth
                                .verifyOtp({
                                    email:
                                        pendingOtpEmail,

                                    token:
                                        otp,

                                    type:
                                        "email"
                                });


                        if (error) {

                            console.error(
                                "NITRIXA OTP verification error:",
                                error
                            );

                            showMessage(
                                getOtpErrorMessage(
                                    error
                                ),
                                "error"
                            );

                            return;
                        }


                        if (
                            !data ||
                            !data.session ||
                            !data.user
                        ) {

                            showMessage(
                                "Email verification completed, but no active session was created. Please login with your email and password.",
                                "success"
                            );

                            window.setTimeout(
                                () => {

                                    hideOtpPanel();

                                },
                                1000
                            );

                            return;
                        }


                        /*
                         * OTP verified.
                         *
                         * The user now has a valid
                         * authenticated session.
                         */

                        if (otpStatus) {

                            otpStatus.textContent =
                                "Email verified successfully.";
                        }


                        const isAdmin =
                            await isCurrentUserAdmin();


                        if (
                            isAdmin
                        ) {

                            redirectToAdminDashboard();

                        } else {

                            redirectToDashboard(
                                "Email verified successfully. Opening your Intern Dashboard..."
                            );
                        }


                    } catch (
                        error
                    ) {

                        console.error(
                            "NITRIXA unexpected OTP error:",
                            error
                        );

                        showMessage(
                            "Something went wrong while verifying your email. Please try again.",
                            "error"
                        );

                    } finally {

                        setButtonLoading(
                            verifyOtpButton,
                            false,
                            "Verifying..."
                        );
                    }

                }
            );
        }


        /* =====================================================
           RESEND OTP
        ===================================================== */

        if (resendOtpButton) {

            resendOtpButton.addEventListener(
                "click",
                async () => {

                    clearMessage();


                    if (
                        !pendingOtpEmail ||
                        !pendingOtpPassword
                    ) {

                        showMessage(
                            "Your registration session has expired. Please register again.",
                            "error"
                        );

                        return;
                    }


                    if (
                        resendSeconds > 0
                    ) {

                        return;
                    }


                    resendOtpButton.disabled =
                        true;

                    resendOtpButton.textContent =
                        "Sending OTP...";


                    try {

                        const {
                            error
                        } =
                            await supabase.auth
                                .resend({
                                    type:
                                        "signup",

                                    email:
                                        pendingOtpEmail
                                });


                        if (error) {

                            console.error(
                                "NITRIXA resend OTP error:",
                                error
                            );

                            showMessage(
                                getOtpErrorMessage(
                                    error
                                ),
                                "error"
                            );

                            updateResendButton();

                            return;
                        }


                        if (otpStatus) {

                            otpStatus.textContent =
                                "A new 6-digit verification code has been sent to your email.";
                        }


                        showMessage(
                            "A new verification code has been sent.",
                            "success"
                        );


                        if (otpInput) {

                            otpInput.value =
                                "";

                            otpInput.focus();
                        }


                        startResendTimer();


                    } catch (
                        error
                    ) {

                        console.error(
                            "NITRIXA unexpected resend error:",
                            error
                        );

                        showMessage(
                            "Unable to resend the OTP right now. Please try again.",
                            "error"
                        );

                        updateResendButton();
                    }

                }
            );
        }


        /* =====================================================
           BACK TO LOGIN
        ===================================================== */

        if (backToLoginButton) {

            backToLoginButton.addEventListener(
                "click",
                () => {

                    hideOtpPanel();

                }
            );
        }


        /* =====================================================
           TAB EVENTS
        ===================================================== */

        if (loginTab) {

            loginTab.addEventListener(
                "click",
                () => {

                    setMode(
                        "login"
                    );

                }
            );
        }


        if (registerTab) {

            registerTab.addEventListener(
                "click",
                () => {

                    setMode(
                        "register"
                    );

                }
            );
        }


        if (switchToRegister) {

            switchToRegister.addEventListener(
                "click",
                () => {

                    setMode(
                        "register"
                    );

                }
            );
        }


        if (switchToLogin) {

            switchToLogin.addEventListener(
                "click",
                () => {

                    setMode(
                        "login"
                    );

                }
            );
        }


        /* =====================================================
           PASSWORD TOGGLE
        ===================================================== */

        document
            .querySelectorAll(
                ".password-toggle"
            )
            .forEach(
                toggle => {

                    toggle.addEventListener(
                        "click",
                        () => {

                            const targetId =
                                toggle.dataset.target;

                            const input =
                                document.getElementById(
                                    targetId
                                );

                            if (!input) {
                                return;
                            }


                            if (
                                input.type ===
                                "password"
                            ) {

                                input.type =
                                    "text";

                                toggle.textContent =
                                    "Hide";

                                toggle.setAttribute(
                                    "aria-label",
                                    "Hide password"
                                );

                            } else {

                                input.type =
                                    "password";

                                toggle.textContent =
                                    "Show";

                                toggle.setAttribute(
                                    "aria-label",
                                    "Show password"
                                );
                            }

                        }
                    );

                }
            );


        /* =====================================================
           FORGOT PASSWORD
        ===================================================== */

        if (forgotPasswordButton) {

            forgotPasswordButton.addEventListener(
                "click",
                async () => {

                    clearMessage();


                    const emailInput =
                        document.getElementById(
                            "loginEmail"
                        );

                    const email =
                        normalizeEmail(
                            emailInput
                                ? emailInput.value
                                : ""
                        );


                    if (
                        !isValidEmail(
                            email
                        )
                    ) {

                        if (emailInput) {

                            markInputError(
                                emailInput
                            );
                        }

                        showMessage(
                            "Enter your registered email address first.",
                            "error"
                        );

                        return;
                    }


                    forgotPasswordButton.disabled =
                        true;

                    forgotPasswordButton.textContent =
                        "Sending...";


                    try {

                        const {
                            error
                        } =
                            await supabase.auth
                                .resetPasswordForEmail(
                                    email,
                                    {
                                        redirectTo:
                                            `${window.location.origin}/login.html`
                                    }
                                );


                        if (error) {

                            console.error(
                                "NITRIXA password reset error:",
                                error
                            );

                            showMessage(
                                "Unable to send the password reset email. Please try again.",
                                "error"
                            );

                            return;
                        }


                        showMessage(
                            "Password reset instructions have been sent to your email.",
                            "success"
                        );


                    } catch (
                        error
                    ) {

                        console.error(
                            "NITRIXA unexpected password reset error:",
                            error
                        );

                        showMessage(
                            "Unable to send the password reset email. Please try again.",
                            "error"
                        );

                    } finally {

                        forgotPasswordButton.disabled =
                            false;

                        forgotPasswordButton.textContent =
                            "Forgot password?";
                    }

                }
            );
        }


        /* =====================================================
           EXISTING SESSION CHECK
        ===================================================== */

        try {

            const {
                data
            } =
                await supabase.auth.getSession();


            if (
                data &&
                data.session &&
                data.session.user
            ) {

                const isAdmin =
                    await isCurrentUserAdmin();


                if (
                    isAdmin
                ) {

                    window.location.href =
                        "admin/dashboard.html";

                } else {

                    window.location.href =
                        "intern-dashboard.html";
                }
            }

        } catch (
            error
        ) {

            console.error(
                "NITRIXA: Existing session check failed:",
                error
            );
        }


        /* =====================================================
           DEFAULT MODE
        ===================================================== */

        setMode(
            "login"
        );

    }
);