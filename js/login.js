/* =========================================================
   NITRIXA TECHNOLOGIES
   PUBLIC LOGIN / REGISTRATION

   LOCKED AUTHENTICATION FLOW

   PUBLIC WEBSITE
        ↓
   LOGIN / REGISTER
        ↓
   AUTHENTICATION SUCCESS
        ↓
   CHECK ADMIN
        ↓
   ┌───────────────┬────────────────┐
   │               │                │
   ADMIN          USER             USER
   │               │                │
   ↓               ↓                ↓
   ADMIN        INTERN           DASHBOARD
   DASHBOARD    DASHBOARD        FLOW

   IMPORTANT:
   - Registration creates a user account.
   - Admin users go to Admin Dashboard.
   - Normal users go to Intern Dashboard.
   - Intern ID is NOT required to enter dashboard.
   - Enrollment happens from the dashboard.
   - Payment / Intern ID generation is handled separately.
   - No program/path dependency exists here.
   ========================================================= */


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

            showMessage(
                "Authentication service is currently unavailable. Please refresh the page and try again.",
                "error"
            );

            return;

        }


        const supabase =
            window.supabaseClient;


        /* =====================================================
           URL PARAMETERS
        ===================================================== */

        const params =
            new URLSearchParams(
                window.location.search
            );


        /*
         * Selected program.
         */

        const program =
            (
                params.get(
                    "program"
                ) || ""
            )
                .trim();


        /*
         * Enrollment path.
         *
         * internship
         * training-internship
         */

        const path =
            (
                params.get(
                    "path"
                ) || ""
            )
                .trim()
                .toLowerCase();


        /*
         * Redirect parameter.
         */

        let redirectPage =
            params.get(
                "redirect"
            );


        /*
         * Legacy parameter.
         */

        const returnTarget =
            (
                params.get(
                    "return"
                ) || ""
            )
                .trim()
                .toLowerCase();


        /* =====================================================
           SAFE REDIRECT
        ===================================================== */

        function getSafeRedirect(
            redirect
        ) {

            if (!redirect) {

                return "login.html";

            }


            const value =
                String(
                    redirect
                ).trim();


            /*
             * Never allow external URLs.
             */

            if (
                value.startsWith("/") ||
                value.startsWith("\\") ||
                value.includes("://") ||
                value.includes("\\")
            ) {

                return "login.html";

            }


            /*
             * Only local HTML pages are allowed.
             */

            if (
                !value.endsWith(".html")
            ) {

                return "login.html";

            }


            /*
             * Admin pages must never be
             * accepted as public login redirects.
             */

            if (
                value.startsWith("admin/")
            ) {

                return "login.html";

            }


            return value;

        }


        /* =====================================================
           BUILD REDIRECT URL
        ===================================================== */

        function buildRedirectUrl() {

            const safeRedirect =
                getSafeRedirect(
                    redirectPage
                );


            if (
                safeRedirect !==
                "login.html"
            ) {

                const redirectParams =
                    new URLSearchParams();


                if (
                    program
                ) {

                    redirectParams.set(
                        "program",
                        program
                    );

                }


                if (
                    path
                ) {

                    redirectParams.set(
                        "path",
                        path
                    );

                }


                const query =
                    redirectParams.toString();


                return (
                    safeRedirect +
                    (
                        query
                            ? "?" + query
                            : ""
                    )
                );

            }


            return "login.html";

        }


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
                        "Sign in to continue with your NITRIXA journey.";

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
           EMAIL NORMALIZATION
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
                .trim()
                .toLowerCase();

        }


        /* =====================================================
           MOBILE NORMALIZATION
        ===================================================== */

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


        /* =====================================================
           VALIDATION
        ===================================================== */

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

            const normalized =
                normalizeMobile(
                    mobile
                );

            return /^\+?[0-9]{8,15}$/.test(
                normalized
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
           REGISTRATION ERROR MESSAGE
        ===================================================== */

        function getRegistrationErrorMessage(
            error
        ) {

            const errorText =
                String(
                    error?.message || ""
                ).toLowerCase();


            if (
                errorText.includes(
                    "already registered"
                ) ||
                errorText.includes(
                    "already exists"
                ) ||
                errorText.includes(
                    "user already"
                )
            ) {

                return (
                    "An account with this email already exists. Please use Login instead."
                );

            }


            if (
                errorText.includes(
                    "email address"
                ) &&
                errorText.includes(
                    "invalid"
                )
            ) {

                return (
                    "Please enter a valid email address, for example: name@gmail.com"
                );

            }


            if (
                errorText.includes(
                    "password"
                ) &&
                (
                    errorText.includes("at least") ||
                    errorText.includes("short") ||
                    errorText.includes("weak")
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
                400
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

                    return {
                        isAdmin: false,
                        error
                    };

                }


                return {
                    isAdmin:
                        data === true,
                    error: null
                };

            } catch (error) {

                console.error(
                    "NITRIXA: Unexpected admin access check error:",
                    error
                );

                return {
                    isAdmin: false,
                    error
                };

            }

        }


        /* =====================================================
           ADMIN DASHBOARD REDIRECT
        ===================================================== */

        function redirectToAdminDashboard(
            message
        ) {

            showMessage(
                message ||
                "Login successful. Opening your Admin Dashboard...",
                "success"
            );

            window.setTimeout(
                () => {

                    window.location.href =
                        "admin/dashboard.html";

                },
                400
            );

        }


        /* =====================================================
           LOGIN
        ===================================================== */

        if (
            loginForm
        ) {

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


                    if (!password) {

                        markInputError(
                            passwordInput
                        );

                        showMessage(
                            "Please enter your password.",
                            "error"
                        );

                        return;

                    }


                    const button =
                        document.getElementById(
                            "loginButton"
                        );


                    setButtonLoading(
                        button,
                        true,
                        "Signing In..."
                    );


                    try {

                        console.log(
                            "NITRIXA: Login attempt:",
                            email
                        );


                        /*
                         * STEP 1
                         *
                         * Authenticate with Supabase.
                         */

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
                                ).toLowerCase();


                            let message =
                                "Login failed. Please check your email and password.";


                            if (
                                errorText.includes(
                                    "invalid login credentials"
                                )
                            ) {

                                message =
                                    "Incorrect email or password. Please check your details and try again.";

                            }


                            if (
                                errorText.includes(
                                    "email not confirmed"
                                )
                            ) {

                                message =
                                    "Your email has not been confirmed yet. Please complete the email confirmation before logging in.";

                            }


                            if (
                                errorText.includes(
                                    "too many requests"
                                ) ||
                                errorText.includes(
                                    "rate limit"
                                )
                            ) {

                                message =
                                    "Too many login attempts. Please wait a few minutes and try again.";

                            }


                            showMessage(
                                message,
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


                        /* =================================================
                           STEP 2 — CHECK ADMIN FIRST
                        ================================================= */

                        console.log(
                            "NITRIXA: Checking account role..."
                        );


                        const {
                            isAdmin,
                            error: adminError
                        } =
                            await isCurrentUserAdmin();


                        /*
                         * Do NOT send a user to the
                         * wrong dashboard if admin
                         * verification failed.
                         */

                        if (
                            adminError
                        ) {

                            showMessage(
                                "We could not verify your account access. Please try again.",
                                "error"
                            );

                            return;

                        }


                        /*
                         * ADMIN USER
                         */

                        if (
                            isAdmin
                        ) {

                            console.log(
                                "NITRIXA: Admin user detected."
                            );


                            redirectToAdminDashboard(
                                "Login successful. Opening your Admin Dashboard..."
                            );

                            return;

                        }


                        /* =================================================
                           STEP 3 — NORMAL USER
                        ================================================= */

                        /*
                         * Existing locked flow:
                         *
                         * Authentication success is enough
                         * to enter the Intern Dashboard.
                         *
                         * We DO NOT check:
                         * - interns table
                         * - Intern ID
                         * - enrollment
                         * - program
                         * - path
                         */

                        console.log(
                            "NITRIXA: Normal user detected."
                        );


                        redirectToDashboard(
                            "Login successful. Opening your Intern Dashboard..."
                        );

                    } catch (error) {

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

        if (
            registerForm
        ) {

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


                    if (
                        !nameInput ||
                        !emailInput ||
                        !mobileInput ||
                        !passwordInput ||
                        !confirmPasswordInput ||
                        !consentInput
                    ) {

                        console.error(
                            "NITRIXA: Registration form fields are missing."
                        );

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


                    const button =
                        document.getElementById(
                            "registerButton"
                        );


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
                         * Supabase may return a session
                         * when email confirmation is disabled.
                         *
                         * A newly registered user is a
                         * normal user, not an admin.
                         */

                        if (
                            data &&
                            data.session &&
                            data.user
                        ) {

                            redirectToDashboard(
                                "Account created successfully. Opening your Intern Dashboard..."
                            );

                            return;

                        }


                        /*
                         * If Supabase requires email
                         * confirmation, show confirmation panel.
                         */

                        if (loginForm) {

                            loginForm.classList.add(
                                "is-hidden"
                            );

                        }


                        registerForm.classList.add(
                            "is-hidden"
                        );


                        if (confirmationPanel) {

                            confirmationPanel.classList.remove(
                                "is-hidden"
                            );

                        }


                        if (loginTab) {

                            loginTab.classList.remove(
                                "active"
                            );

                        }


                        if (registerTab) {

                            registerTab.classList.remove(
                                "active"
                            );

                        }


                        if (authTitle) {

                            authTitle.textContent =
                                "Check your email";

                        }


                        if (authSubtitle) {

                            authSubtitle.textContent =
                                "Complete account verification before signing in.";

                        }


                        showMessage(
                            "Your account was created. Please confirm your email, then return here and login.",
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
           FORGOT PASSWORD
        ===================================================== */

        if (
            forgotPasswordButton
        ) {

            forgotPasswordButton.addEventListener(
                "click",
                async () => {

                    clearMessage();


                    const emailInput =
                        document.getElementById(
                            "loginEmail"
                        );


                    if (
                        !emailInput
                    ) {

                        return;

                    }


                    const email =
                        normalizeEmail(
                            emailInput.value
                        );


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
                            "Enter your email address first, then click Forgot password.",
                            "error"
                        );

                        return;

                    }


                    forgotPasswordButton.disabled =
                        true;


                    try {

                        const {
                            error
                        } =
                            await supabase.auth
                                .resetPasswordForEmail(
                                    email,
                                    {
                                        redirectTo:
                                            window.location.origin +
                                            "/login.html"
                                    }
                                );


                        if (
                            error
                        ) {

                            console.error(
                                "NITRIXA password reset error:",
                                error
                            );

                            showMessage(
                                "We could not send the password reset email. Please try again.",
                                "error"
                            );

                            return;

                        }


                        showMessage(
                            "If an account exists for this email, a password reset email has been sent.",
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
                            "Unable to process the password reset request right now.",
                            "error"
                        );

                    } finally {

                        forgotPasswordButton.disabled =
                            false;

                    }

                }
            );

        }


        /* =====================================================
           TAB EVENTS
        ===================================================== */

        if (
            loginTab
        ) {

            loginTab.addEventListener(
                "click",
                () => {

                    setMode(
                        "login"
                    );

                }
            );

        }


        if (
            registerTab
        ) {

            registerTab.addEventListener(
                "click",
                () => {

                    setMode(
                        "register"
                    );

                }
            );

        }


        if (
            switchToRegister
        ) {

            switchToRegister.addEventListener(
                "click",
                () => {

                    setMode(
                        "register"
                    );

                }
            );

        }


        if (
            switchToLogin
        ) {

            switchToLogin.addEventListener(
                "click",
                () => {

                    setMode(
                        "login"
                    );

                }
            );

        }


        if (
            backToLoginButton
        ) {

            backToLoginButton.addEventListener(
                "click",
                () => {

                    setMode(
                        "login"
                    );

                }
            );

        }


        /* =====================================================
           PASSWORD VISIBILITY
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


                            if (
                                !input
                            ) {

                                return;

                            }


                            const showing =
                                input.type === "text";


                            input.type =
                                showing
                                    ? "password"
                                    : "text";


                            toggle.textContent =
                                showing
                                    ? "Show"
                                    : "Hide";


                            toggle.setAttribute(
                                "aria-label",
                                showing
                                    ? "Show password"
                                    : "Hide password"
                            );

                        }
                    );

                }
            );


        /* =====================================================
           REMOVE INPUT ERRORS
        ===================================================== */

        document
            .querySelectorAll(
                ".auth-field input"
            )
            .forEach(
                input => {

                    input.addEventListener(
                        "input",
                        () => {

                            input.classList.remove(
                                "input-error"
                            );

                        }
                    );

                }
            );


        /* =====================================================
           CHECK EXISTING SESSION
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

                console.log(
                    "NITRIXA: Existing authenticated session detected."
                );


                /* =================================================
                   EXISTING SESSION — CHECK ADMIN FIRST
                ================================================= */

                const {
                    isAdmin,
                    error: adminError
                } =
                    await isCurrentUserAdmin();


                /*
                 * Do not redirect anywhere if the
                 * admin verification itself failed.
                 */

                if (
                    adminError
                ) {

                    console.error(
                        "NITRIXA: Existing-session admin verification failed."
                    );

                    showMessage(
                        "We could not verify your account access. Please refresh and try again.",
                        "error"
                    );

                    return;

                }


                /*
                 * EXISTING ADMIN SESSION
                 */

                if (
                    isAdmin
                ) {

                    console.log(
                        "NITRIXA: Existing admin session detected."
                    );


                    redirectToAdminDashboard(
                        "You are already signed in. Opening your Admin Dashboard..."
                    );

                    return;

                }


                /*
                 * EXISTING NORMAL USER SESSION
                 *
                 * Existing locked flow:
                 *
                 * Any authenticated normal user
                 * can access the Intern Dashboard.
                 */

                console.log(
                    "NITRIXA: Existing normal-user session detected."
                );


                redirectToDashboard(
                    "You are already signed in. Opening your Intern Dashboard..."
                );

            }

        } catch (
            error
        ) {

            console.error(
                "NITRIXA session check failed:",
                error
            );


            /*
             * Do not force logout because of a
             * temporary session-check failure.
             */

        }

    }
);