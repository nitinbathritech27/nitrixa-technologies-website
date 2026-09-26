/* =========================================================
   NITRIXA TECHNOLOGIES
   ADMIN JAVASCRIPT
   Supabase Authentication + Application Management
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================================
       SUPABASE CHECK
       ===================================================== */

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        console.error(
            "NITRIXA: Supabase client is not available."
        );

        return;
    }


    /* =====================================================
       ADMIN LOGIN
       ===================================================== */

    const loginForm =
        document.getElementById("adminLoginForm");


    if (loginForm) {

        const email =
            document.getElementById("adminEmail");

        const password =
            document.getElementById("adminPassword");

        const togglePassword =
            document.getElementById("togglePassword");

        const status =
            document.getElementById("adminLoginStatus");

        const submitButton =
            loginForm.querySelector(
                ".admin-login-button"
            );


        /* -------------------------------------------------
           PASSWORD TOGGLE
           ------------------------------------------------- */

        if (togglePassword && password) {

            togglePassword.addEventListener(
                "click",
                () => {

                    const isPassword =
                        password.type === "password";


                    password.type =
                        isPassword
                            ? "text"
                            : "password";


                    togglePassword.textContent =
                        isPassword
                            ? "Hide"
                            : "Show";


                    togglePassword.setAttribute(
                        "aria-label",
                        isPassword
                            ? "Hide password"
                            : "Show password"
                    );

                }
            );

        }


        /* -------------------------------------------------
           ERROR HELPERS
           ------------------------------------------------- */

        const showError = (
            field,
            message
        ) => {

            if (!field) {
                return;
            }

            field.classList.add("input-error");


            const error =
                document.querySelector(
                    `[data-error-for="${field.id}"]`
                );


            if (error) {
                error.textContent = message;
            }

        };


        const clearError = (
            field
        ) => {

            if (!field) {
                return;
            }

            field.classList.remove("input-error");


            const error =
                document.querySelector(
                    `[data-error-for="${field.id}"]`
                );


            if (error) {
                error.textContent = "";
            }

        };


        /* -------------------------------------------------
           LOGIN SUBMIT
           ------------------------------------------------- */

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                clearError(email);
                clearError(password);


                if (status) {

                    status.textContent = "";
                    status.className = "form-status";

                }


                const emailValue =
                    email
                        ? email.value.trim()
                        : "";

                const passwordValue =
                    password
                        ? password.value
                        : "";


                let valid = true;


                const emailPattern =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


                if (
                    !emailValue ||
                    !emailPattern.test(emailValue)
                ) {

                    showError(
                        email,
                        "Please enter a valid email address."
                    );

                    valid = false;

                }


                if (
                    !passwordValue ||
                    passwordValue.length < 6
                ) {

                    showError(
                        password,
                        "Password must contain at least 6 characters."
                    );

                    valid = false;

                }


                if (!valid) {

                    if (status) {

                        status.textContent =
                            "Please correct the highlighted fields.";

                        status.className =
                            "form-status error";

                    }

                    return;

                }


                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.textContent =
                        "Signing In...";

                }


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signInWithPassword({
                                email: emailValue,
                                password: passwordValue
                            });


                    if (error) {

                        console.error(
                            "NITRIXA admin login error:",
                            error
                        );

                        if (status) {

                            status.textContent =
                                "Invalid email or password.";

                            status.className =
                                "form-status error";

                        }

                        return;
                    }


                    if (!data.user) {

                        if (status) {

                            status.textContent =
                                "Login could not be completed.";

                            status.className =
                                "form-status error";

                        }

                        return;
                    }


                    /* -------------------------------------
                       ADMIN AUTHORIZATION
                       ------------------------------------- */

                    const {
                        data: isAdmin,
                        error: adminError
                    } =
                        await supabaseClient
                            .rpc("is_admin");


                    if (
                        adminError ||
                        !isAdmin
                    ) {

                        console.error(
                            "NITRIXA admin authorization error:",
                            adminError
                        );


                        await supabaseClient.auth.signOut();


                        if (status) {

                            status.textContent =
                                "This account is not authorized as an administrator.";

                            status.className =
                                "form-status error";

                        }

                        return;
                    }


                    window.location.href =
                        "dashboard.html";

                } catch (error) {

                    console.error(
                        "NITRIXA unexpected login error:",
                        error
                    );


                    if (status) {

                        status.textContent =
                            "Something went wrong. Please try again.";

                        status.className =
                            "form-status error";

                    }

                } finally {

                    if (submitButton) {

                        submitButton.disabled = false;

                        submitButton.textContent =
                            "Sign In";

                    }

                }

            }
        );

        return;
    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    const tableBody =
        document.getElementById(
            "applicationsTableBody"
        );


    if (!tableBody) {
        return;
    }


    /* =====================================================
       ADMIN AUTHORIZATION
       ===================================================== */

    try {

        const {
            data: {
                session
            }
        } =
            await supabaseClient.auth.getSession();


        if (!session) {

            window.location.href =
                "login.html";

            return;
        }


        const {
            data: isAdmin,
            error: adminError
        } =
            await supabaseClient
                .rpc("is_admin");


        if (
            adminError ||
            !isAdmin
        ) {

            console.error(
                "NITRIXA admin authorization failed:",
                adminError
            );


            await supabaseClient.auth.signOut();


            window.location.href =
                "login.html";

            return;
        }

    } catch (error) {

        console.error(
            "NITRIXA dashboard authorization error:",
            error
        );


        window.location.href =
            "login.html";

        return;
    }


    /* =====================================================
       STATE
       ===================================================== */

    let applications = [];

    let filteredApplications = [];

    let currentPage = 1;

    const rowsPerPage = 5;


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const searchInput =
        document.getElementById(
            "applicationSearch"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );

    const typeFilter =
        document.getElementById(
            "typeFilter"
        );

    const emptyState =
        document.getElementById(
            "emptyApplications"
        );

    const applicationCount =
        document.getElementById(
            "applicationCount"
        );

    const previousButton =
        document.getElementById(
            "previousPage"
        );

    const nextButton =
        document.getElementById(
            "nextPage"
        );

    const currentPageElement =
        document.getElementById(
            "currentPage"
        );

    const refreshButton =
        document.getElementById(
            "refreshApplications"
        );

    const dataStatusDot =
        document.getElementById(
            "dataStatusDot"
        );

    const dataStatusText =
        document.getElementById(
            "dataStatusText"
        );


    /* =====================================================
       STATISTICS
       ===================================================== */

    const totalElement =
        document.getElementById(
            "totalApplications"
        );

    const newElement =
        document.getElementById(
            "newApplications"
        );

    const contactedElement =
        document.getElementById(
            "contactedApplications"
        );

    const approvedElement =
        document.getElementById(
            "approvedApplications"
        );

    const rejectedElement =
        document.getElementById(
            "rejectedApplications"
        );


    /* =====================================================
       STATUS CLASS
       ===================================================== */

    const statusClass = (
        status
    ) => {

        return {
            NEW: "status-new",
            CONTACTED: "status-contacted",
            APPROVED: "status-approved",
            REJECTED: "status-rejected"
        }[status] || "status-new";

    };


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    const escapeHtml = (
        value
    ) => {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    };


    /* =====================================================
       DATE FORMAT
       ===================================================== */

    const formatDate = (
        value
    ) => {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }


        return new Intl.DateTimeFormat(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);

    };


    /* =====================================================
       UPDATE DATA STATUS
       ===================================================== */

    const setDataStatus = (
        message,
        isError = false
    ) => {

        if (dataStatusText) {
            dataStatusText.textContent =
                message;
        }


        if (dataStatusDot) {

            dataStatusDot.classList.toggle(
                "error",
                isError
            );

        }

    };


    /* =====================================================
       UPDATE STATISTICS
       ===================================================== */

    const updateStats = () => {

        if (totalElement) {

            totalElement.textContent =
                applications.length;

        }


        if (newElement) {

            newElement.textContent =
                applications.filter(
                    (item) =>
                        item.status === "NEW"
                ).length;

        }


        if (contactedElement) {

            contactedElement.textContent =
                applications.filter(
                    (item) =>
                        item.status === "CONTACTED"
                ).length;

        }


        if (approvedElement) {

            approvedElement.textContent =
                applications.filter(
                    (item) =>
                        item.status === "APPROVED"
                ).length;

        }


        if (rejectedElement) {

            rejectedElement.textContent =
                applications.filter(
                    (item) =>
                        item.status === "REJECTED"
                ).length;

        }

    };


    /* =====================================================
       LOAD APPLICATIONS
       ===================================================== */

    const loadApplications = async () => {

        if (refreshButton) {

            refreshButton.disabled = true;

            refreshButton.textContent =
                "Loading...";

        }


        setDataStatus(
            "Loading..."
        );


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("applications")
                    .select(
                        `
                        id,
                        full_name,
                        email,
                        application_type,
                        program,
                        qualification,
                        city,
                        status,
                        created_at
                        `
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {

                console.error(
                    "NITRIXA application load error:",
                    error
                );


                applications = [];

                filteredApplications = [];

                updateStats();

                renderTable();


                setDataStatus(
                    "Unable to load data",
                    true
                );

                return;
            }


            applications =
                Array.isArray(data)
                    ? data
                    : [];


            filteredApplications =
                [...applications];


            currentPage = 1;


            updateStats();

            renderTable();


            setDataStatus(
                "Live data"
            );

        } catch (error) {

            console.error(
                "NITRIXA unexpected application load error:",
                error
            );


            applications = [];

            filteredApplications = [];

            updateStats();

            renderTable();


            setDataStatus(
                "Connection error",
                true
            );

        } finally {

            if (refreshButton) {

                refreshButton.disabled = false;

                refreshButton.textContent =
                    "↻ Refresh";

            }

        }

    };


    /* =====================================================
       UPDATE APPLICATION STATUS
       ===================================================== */

    const updateApplicationStatus = async (
        applicationId,
        newStatus,
        selectElement
    ) => {

        if (
            !applicationId ||
            !newStatus ||
            !selectElement
        ) {
            return;
        }


        const application =
            applications.find(
                (item) =>
                    String(item.id) ===
                    String(applicationId)
            );


        if (!application) {
            return;
        }


        const previousStatus =
            application.status;


        if (
            previousStatus ===
            newStatus
        ) {
            return;
        }


        selectElement.disabled = true;

        selectElement.setAttribute(
            "aria-busy",
            "true"
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("applications")
                    .update({
                        status: newStatus
                    })
                    .eq(
                        "id",
                        applicationId
                    );


            if (error) {

                console.error(
                    "NITRIXA status update error:",
                    error
                );


                selectElement.value =
                    previousStatus;


                window.alert(
                    "The application status could not be updated. Please try again."
                );

                return;
            }


            /* ---------------------------------------------
               UPDATE LOCAL STATE
               --------------------------------------------- */

            application.status =
                newStatus;


            const filteredApplication =
                filteredApplications.find(
                    (item) =>
                        String(item.id) ===
                        String(applicationId)
                );


            if (filteredApplication) {

                filteredApplication.status =
                    newStatus;

            }


            updateStats();


            /* ---------------------------------------------
               UPDATE VISUAL STATUS
               --------------------------------------------- */

            selectElement.className =
                `status-select ${statusClass(newStatus)}`;


            setDataStatus(
                "Changes saved"
            );


            window.setTimeout(
                () => {

                    setDataStatus(
                        "Live data"
                    );

                },
                1500
            );

        } catch (error) {

            console.error(
                "NITRIXA unexpected status update error:",
                error
            );


            selectElement.value =
                previousStatus;


            window.alert(
                "Something went wrong while updating the status."
            );

        } finally {

            selectElement.disabled = false;

            selectElement.removeAttribute(
                "aria-busy"
            );

        }

    };


    /* =====================================================
       CREATE STATUS SELECT
       ===================================================== */

    const createStatusSelect = (
        application
    ) => {

        const select =
            document.createElement(
                "select"
            );


        select.className =
            `status-select ${statusClass(application.status)}`;


        select.setAttribute(
            "aria-label",
            `Update status for ${application.full_name}`
        );


        const statuses = [
            {
                value: "NEW",
                label: "New"
            },
            {
                value: "CONTACTED",
                label: "Contacted"
            },
            {
                value: "APPROVED",
                label: "Approved"
            },
            {
                value: "REJECTED",
                label: "Rejected"
            }
        ];


        statuses.forEach(
            (statusOption) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    statusOption.value;

                option.textContent =
                    statusOption.label;


                select.appendChild(
                    option
                );

            }
        );


        select.value =
            application.status;


        select.addEventListener(
            "change",
            () => {

                updateApplicationStatus(
                    application.id,
                    select.value,
                    select
                );

            }
        );


        return select;

    };


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    const renderTable = () => {

        tableBody.innerHTML = "";


        if (
            filteredApplications.length === 0
        ) {

            if (emptyState) {
                emptyState.hidden = false;
            }

            if (applicationCount) {

                applicationCount.textContent =
                    "Showing 0 applications";

            }

            if (previousButton) {
                previousButton.disabled = true;
            }

            if (nextButton) {
                nextButton.disabled = true;
            }

            if (currentPageElement) {
                currentPageElement.textContent =
                    "1";
            }

            return;
        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        const totalPages =
            Math.ceil(
                filteredApplications.length /
                rowsPerPage
            );


        if (
            currentPage >
            totalPages
        ) {
            currentPage =
                totalPages;
        }


        const start =
            (currentPage - 1) *
            rowsPerPage;


        const visibleApplications =
            filteredApplications.slice(
                start,
                start + rowsPerPage
            );


        visibleApplications.forEach(
            (application) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                /* -----------------------------------------
                   APPLICANT
                   ----------------------------------------- */

                const applicantCell =
                    document.createElement(
                        "td"
                    );


                applicantCell.innerHTML = `

                    <span class="applicant-name">
                        ${escapeHtml(application.full_name)}
                    </span>

                    <span class="applicant-email">
                        ${escapeHtml(application.email)}
                    </span>

                `;


                row.appendChild(
                    applicantCell
                );


                /* -----------------------------------------
                   TYPE
                   ----------------------------------------- */

                const typeCell =
                    document.createElement(
                        "td"
                    );


                typeCell.innerHTML = `
                    <span class="application-type">
                        ${escapeHtml(application.application_type)}
                    </span>
                `;


                row.appendChild(
                    typeCell
                );


                /* -----------------------------------------
                   PROGRAM
                   ----------------------------------------- */

                const programCell =
                    document.createElement(
                        "td"
                    );


                programCell.textContent =
                    application.program || "—";


                row.appendChild(
                    programCell
                );


                /* -----------------------------------------
                   QUALIFICATION
                   ----------------------------------------- */

                const qualificationCell =
                    document.createElement(
                        "td"
                    );


                qualificationCell.textContent =
                    application.qualification || "—";


                row.appendChild(
                    qualificationCell
                );


                /* -----------------------------------------
                   CITY
                   ----------------------------------------- */

                const cityCell =
                    document.createElement(
                        "td"
                    );


                cityCell.textContent =
                    application.city || "—";


                row.appendChild(
                    cityCell
                );


                /* -----------------------------------------
                   STATUS
                   ----------------------------------------- */

                const statusCell =
                    document.createElement(
                        "td"
                    );


                const statusSelect =
                    createStatusSelect(
                        application
                    );


                statusCell.appendChild(
                    statusSelect
                );


                row.appendChild(
                    statusCell
                );


                /* -----------------------------------------
                   DATE
                   ----------------------------------------- */

                const dateCell =
                    document.createElement(
                        "td"
                    );


                dateCell.textContent =
                    formatDate(
                        application.created_at
                    );


                row.appendChild(
                    dateCell
                );


                tableBody.appendChild(
                    row
                );

            }
        );


        const startNumber =
            start + 1;


        const endNumber =
            Math.min(
                start + rowsPerPage,
                filteredApplications.length
            );


        if (applicationCount) {

            applicationCount.textContent =
                `Showing ${startNumber}-${endNumber} of ${filteredApplications.length} applications`;

        }


        if (currentPageElement) {

            currentPageElement.textContent =
                currentPage;

        }


        if (previousButton) {

            previousButton.disabled =
                currentPage <= 1;

        }


        if (nextButton) {

            nextButton.disabled =
                currentPage >= totalPages;

        }

    };


    /* =====================================================
       FILTERS
       ===================================================== */

    const applyFilters = () => {

        const search =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "ALL";


        const selectedType =
            typeFilter
                ? typeFilter.value
                : "ALL";


        filteredApplications =
            applications.filter(
                (application) => {

                    const name =
                        String(
                            application.full_name ?? ""
                        ).toLowerCase();


                    const email =
                        String(
                            application.email ?? ""
                        ).toLowerCase();


                    const matchesSearch =
                        !search ||
                        name.includes(search) ||
                        email.includes(search);


                    const matchesStatus =
                        selectedStatus === "ALL" ||
                        application.status ===
                            selectedStatus;


                    const matchesType =
                        selectedType === "ALL" ||
                        application.application_type ===
                            selectedType;


                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesType
                    );

                }
            );


        currentPage = 1;

        renderTable();

    };


    /* =====================================================
       FILTER EVENTS
       ===================================================== */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                if (currentPage <= 1) {
                    return;
                }


                currentPage--;

                renderTable();

            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredApplications.length /
                        rowsPerPage
                    );


                if (
                    currentPage >=
                    totalPages
                ) {
                    return;
                }


                currentPage++;

                renderTable();

            }
        );

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadApplications
        );

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                logoutButton.disabled = true;

                logoutButton.textContent =
                    "Logging out...";


                try {

                    const {
                        error
                    } =
                        await supabaseClient.auth
                            .signOut();


                    if (error) {

                        console.error(
                            "NITRIXA logout error:",
                            error
                        );

                    }

                } finally {

                    window.location.href =
                        "login.html";

                }

            }
        );

    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    await loadApplications();

});