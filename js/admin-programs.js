/* =========================================================
   NITRIXA TECHNOLOGIES
   ADMIN PROGRAM MANAGEMENT
   VERSION 3
   ========================================================= */

(function () {

    "use strict";

    console.log(
        "NITRIXA ADMIN PROGRAMS: JavaScript loaded."
    );


    let programs = [];
    let editingProgramId = null;


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            console.log(
                "NITRIXA ADMIN PROGRAMS: DOM ready."
            );

            setupEvents();

            initializePage();

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initializePage() {

        if (
            typeof window.supabaseClient ===
            "undefined" ||
            !window.supabaseClient
        ) {

            console.error(
                "NITRIXA ADMIN PROGRAMS: Supabase client missing."
            );

            hideLoading();

            showStatus(
                "Supabase client is not available. Check supabase.js.",
                "error"
            );

            return;
        }


        console.log(
            "NITRIXA ADMIN PROGRAMS: Supabase client found."
        );


        const isAdmin =
            await checkAdminAccess();


        if (!isAdmin) {

            hideLoading();

            return;
        }


        await loadPrograms();

    }



    /* =====================================================
       EVENTS
    ===================================================== */

    function setupEvents() {

        console.log(
            "NITRIXA ADMIN PROGRAMS: Setting up events."
        );


        const addButton =
            document.getElementById(
                "openProgramModalButton"
            );


        if (addButton) {

            addButton.addEventListener(
                "click",
                function () {

                    console.log(
                        "NITRIXA: Add Program clicked."
                    );

                    openAddModal();

                }
            );

        } else {

            console.error(
                "NITRIXA: Add Program button not found."
            );
        }



        const closeButton =
            document.getElementById(
                "closeProgramModalButton"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeModal
            );

        }



        const cancelButton =
            document.getElementById(
                "cancelProgramButton"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }



        const refreshButton =
            document.getElementById(
                "refreshProgramsButton"
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                function () {

                    console.log(
                        "NITRIXA: Refresh clicked."
                    );

                    loadPrograms();

                }
            );

        }



        const form =
            document.getElementById(
                "programForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                saveProgram
            );

        }



        const type =
            document.getElementById(
                "programType"
            );


        if (type) {

            type.addEventListener(
                "change",
                updateTypeFields
            );

        }



        const logout =
            document.getElementById(
                "adminLogoutButton"
            );


        if (logout) {

            logout.addEventListener(
                "click",
                logoutAdmin
            );

        }



        document.addEventListener(
            "click",
            function (event) {

                const actionButton =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!actionButton) {
                    return;
                }


                const action =
                    actionButton.dataset.action;


                const id =
                    actionButton.dataset.id;


                if (
                    action ===
                    "edit"
                ) {

                    editProgram(id);

                }


                if (
                    action ===
                    "toggle"
                ) {

                    toggleProgram(id);

                }

            }
        );


        console.log(
            "NITRIXA ADMIN PROGRAMS: Events ready."
        );

    }



    /* =====================================================
       ADMIN ACCESS
    ===================================================== */

    async function checkAdminAccess() {

        try {

            console.log(
                "NITRIXA: Checking admin session..."
            );


            const sessionResponse =
                await window.supabaseClient
                    .auth
                    .getSession();


            if (
                sessionResponse.error
            ) {

                console.error(
                    sessionResponse.error
                );

                showStatus(
                    "Unable to verify login session.",
                    "error"
                );

                return false;
            }


            const session =
                sessionResponse.data &&
                sessionResponse.data.session;


            if (!session) {

                console.warn(
                    "NITRIXA: No active session."
                );

                window.location.href =
                    "login.html";

                return false;
            }


            console.log(
                "NITRIXA: Session found."
            );


            const adminResponse =
                await window.supabaseClient
                    .rpc(
                        "is_admin"
                    );


            if (
                adminResponse.error
            ) {

                console.error(
                    "NITRIXA: is_admin error:",
                    adminResponse.error
                );

                showStatus(
                    "Admin permission check failed: " +
                    adminResponse.error.message,
                    "error"
                );

                return false;
            }


            console.log(
                "NITRIXA: is_admin result:",
                adminResponse.data
            );


            if (
                adminResponse.data !==
                true
            ) {

                showStatus(
                    "You do not have admin permission.",
                    "error"
                );

                setTimeout(
                    function () {

                        window.location.href =
                            "login.html";

                    },
                    1500
                );

                return false;
            }


            return true;


        } catch (error) {

            console.error(
                "NITRIXA: Admin access error:",
                error
            );


            showStatus(
                error.message ||
                "Admin access verification failed.",
                "error"
            );


            return false;
        }

    }



    /* =====================================================
       LOAD PROGRAMS
    ===================================================== */

    async function loadPrograms() {

        console.log(
            "NITRIXA ADMIN PROGRAMS: Loading programs..."
        );


        showLoading();


        try {

            const response =
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
                            "payment_model",
                            "created_at",
                            "updated_at"
                        ].join(",")
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (
                response.error
            ) {

                throw response.error;
            }


            programs =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];


            console.log(
                "NITRIXA ADMIN PROGRAMS: Loaded:",
                programs
            );


            renderPrograms();


        } catch (error) {

            console.error(
                "NITRIXA ADMIN PROGRAMS: Load error:",
                error
            );


            hideLoading();


            showStatus(
                "Programs could not be loaded: " +
                (
                    error.message ||
                    "Unknown error"
                ),
                "error"
            );

        }

    }



    /* =====================================================
       RENDER
    ===================================================== */

    function renderPrograms() {

        hideLoading();


        updateSummary();


        const tbody =
            document.getElementById(
                "programsTableBody"
            );


        const table =
            document.getElementById(
                "programsTableWrapper"
            );


        const empty =
            document.getElementById(
                "programsEmptyState"
            );


        if (!tbody) {

            console.error(
                "NITRIXA: programsTableBody not found."
            );

            return;
        }


        tbody.innerHTML =
            "";


        if (
            programs.length ===
            0
        ) {

            if (table) {
                table.hidden = true;
            }


            if (empty) {
                empty.hidden = false;
            }


            return;
        }


        if (empty) {
            empty.hidden = true;
        }


        if (table) {
            table.hidden = false;
        }


        programs.forEach(
            function (program) {

                tbody.insertAdjacentHTML(
                    "beforeend",
                    createProgramRow(
                        program
                    )
                );

            }
        );


        console.log(
            "NITRIXA: Program table rendered."
        );

    }



    /* =====================================================
       PROGRAM ROW
    ===================================================== */

    function createProgramRow(
        program
    ) {

        const type =
            formatProgramType(
                program.program_type
            );


        const duration =
            getProgramDuration(
                program
            );


        const payment =
            getPaymentLabel(
                program
            );


        const fee =
            Number(
                program.fee || 0
            ).toLocaleString(
                "en-IN"
            );


        const statusClass =
            program.status ===
            "ACTIVE"
                ? "active"
                : "inactive";


        const toggleText =
            program.status ===
            "ACTIVE"
                ? "Deactivate"
                : "Activate";


        return `

            <tr>

                <td>

                    <div class="np-program-name">

                        <strong>
                            ${escapeHtml(
                                program.name ||
                                "Unnamed Program"
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                program.category ||
                                "—"
                            )}
                        </small>

                    </div>

                </td>


                <td>

                    <span class="np-badge">
                        ${escapeHtml(
                            type
                        )}
                    </span>

                </td>


                <td>
                    ${duration}
                </td>


                <td>
                    ₹${fee}
                </td>


                <td>
                    ${escapeHtml(
                        payment
                    )}
                </td>


                <td>

                    <span
                        class="np-status-badge ${statusClass}"
                    >
                        ${escapeHtml(
                            program.status ||
                            "UNKNOWN"
                        )}
                    </span>

                </td>


                <td>

                    <div class="np-actions">

                        <button
                            type="button"
                            class="np-action"
                            data-action="edit"
                            data-id="${escapeHtml(
                                program.id
                            )}"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="np-action"
                            data-action="toggle"
                            data-id="${escapeHtml(
                                program.id
                            )}"
                        >
                            ${toggleText}
                        </button>

                    </div>

                </td>

            </tr>

        `;

    }



    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateSummary() {

        let active =
            0;

        let inactive =
            0;

        let internship =
            0;


        programs.forEach(
            function (program) {

                if (
                    program.status ===
                    "ACTIVE"
                ) {

                    active++;

                }


                if (
                    program.status ===
                    "INACTIVE"
                ) {

                    inactive++;

                }


                if (
                    program.program_type ===
                    "INTERNSHIP"
                ) {

                    internship++;

                }

            }
        );


        setText(
            "totalProgramsCount",
            programs.length
        );


        setText(
            "activeProgramsCount",
            active
        );


        setText(
            "inactiveProgramsCount",
            inactive
        );


        setText(
            "internshipProgramsCount",
            internship
        );

    }



    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    function openAddModal() {

        console.log(
            "NITRIXA: Opening Add Program modal."
        );


        editingProgramId =
            null;


        const form =
            document.getElementById(
                "programForm"
            );


        if (form) {
            form.reset();
        }


        setValue(
            "programId",
            ""
        );


        setValue(
            "programStatus",
            "ACTIVE"
        );


        const title =
            document.getElementById(
                "programModalTitle"
            );


        if (title) {

            title.textContent =
                "Add Program";
        }


        const save =
            document.getElementById(
                "saveProgramButton"
            );


        if (save) {

            save.textContent =
                "Save Program";
        }


        updateTypeFields();


        openModal();

    }



    /* =====================================================
       EDIT
    ===================================================== */

    function editProgram(
        id
    ) {

        const program =
            programs.find(
                function (item) {

                    return String(
                        item.id
                    ) ===
                    String(
                        id
                    );

                }
            );


        if (!program) {

            showStatus(
                "Program not found.",
                "error"
            );

            return;
        }


        editingProgramId =
            program.id;


        setValue(
            "programId",
            program.id
        );


        setValue(
            "programName",
            program.name
        );


        setValue(
            "programSlug",
            program.slug
        );


        setValue(
            "programCategory",
            program.category
        );


        setValue(
            "programDescription",
            program.description
        );


        setValue(
            "programLevel",
            program.level
        );


        setValue(
            "programType",
            program.program_type
        );


        setValue(
            "programDuration",
            program.duration
        );


        setValue(
            "trainingDuration",
            program.training_duration
        );


        setValue(
            "internshipDuration",
            program.internship_duration
        );


        setValue(
            "programFee",
            program.fee
        );


        setValue(
            "paymentModel",
            program.payment_model
        );


        setValue(
            "programTechnologies",
            normalizeTechnologies(
                program.technologies
            ).join(", ")
        );


        setValue(
            "programStatus",
            program.status ||
            "ACTIVE"
        );


        const title =
            document.getElementById(
                "programModalTitle"
            );


        if (title) {

            title.textContent =
                "Edit Program";
        }


        const save =
            document.getElementById(
                "saveProgramButton"
            );


        if (save) {

            save.textContent =
                "Update Program";
        }


        updateTypeFields();


        openModal();

    }



    /* =====================================================
       PROGRAM TYPE
    ===================================================== */

    function updateTypeFields() {

        const type =
            getValue(
                "programType"
            );


        const trainingGroup =
            document.getElementById(
                "trainingDurationGroup"
            );


        const trainingInput =
            document.getElementById(
                "trainingDuration"
            );


        const internshipInput =
            document.getElementById(
                "internshipDuration"
            );


        const payment =
            document.getElementById(
                "paymentModel"
            );


        const note =
            document.getElementById(
                "paymentConfigurationNote"
            );


        if (!trainingGroup) {
            return;
        }


        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            trainingGroup.style.display =
                "";


            trainingInput.required =
                true;


            internshipInput.required =
                true;


            payment.value =
                "FULL_ONLY";


            payment.disabled =
                true;


            note.textContent =
                "Training + Internship uses full payment during enrollment. Internship unlocks after training completion and approval.";

        } else if (
            type ===
            "INTERNSHIP"
        ) {

            trainingGroup.style.display =
                "none";


            trainingInput.required =
                false;


            internshipInput.required =
                true;


            payment.disabled =
                false;


            payment.required =
                true;


            if (!payment.value) {

                payment.value =
                    "FULL_AND_INSTALLMENT";
            }


            note.textContent =
                "Internship can use full payment or the 3-month installment option.";

        } else {

            trainingGroup.style.display =
                "";


            trainingInput.required =
                false;


            internshipInput.required =
                false;


            payment.disabled =
                false;


            payment.required =
                true;


            note.textContent =
                "Select a program type to configure payment.";

        }

    }



    /* =====================================================
       SAVE PROGRAM
    ===================================================== */

    async function saveProgram(
        event
    ) {

        event.preventDefault();


        const button =
            document.getElementById(
                "saveProgramButton"
            );


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Saving...";

            }


            const payload =
                collectForm();


            validateProgram(
                payload
            );


            let response;


            if (
                editingProgramId
            ) {

                response =
                    await window.supabaseClient
                        .from("programs")
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            editingProgramId
                        );

            } else {

                response =
                    await window.supabaseClient
                        .from("programs")
                        .insert(
                            [
                                payload
                            ]
                        );

            }


            if (
                response.error
            ) {

                throw response.error;
            }


            console.log(
                "NITRIXA: Program saved successfully."
            );


            const wasEditing =
                Boolean(
                    editingProgramId
                );


            closeModal();


            showStatus(
                wasEditing
                    ? "Program updated successfully."
                    : "Program created successfully.",
                "success"
            );


            editingProgramId =
                null;


            await loadPrograms();


        } catch (error) {

            console.error(
                "NITRIXA: Save program error:",
                error
            );


            showStatus(
                error.message ||
                "Program could not be saved.",
                "error"
            );

        } finally {

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    editingProgramId
                        ? "Update Program"
                        : "Save Program";

            }

        }

    }



    /* =====================================================
       COLLECT FORM
    ===================================================== */

    function collectForm() {

        const type =
            getValue(
                "programType"
            );


        const technologyText =
            getValue(
                "programTechnologies"
            );


        const technologies =
            technologyText
                ? technologyText
                    .split(",")
                    .map(
                        function (item) {

                            return item.trim();

                        }
                    )
                    .filter(
                        Boolean
                    )
                : [];


        let paymentModel =
            getValue(
                "paymentModel"
            );


        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            paymentModel =
                "FULL_ONLY";
        }


        return {

            name:
                getValue(
                    "programName"
                ),

            slug:
                getValue(
                    "programSlug"
                )
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    ),

            category:
                getValue(
                    "programCategory"
                ),

            description:
                getValue(
                    "programDescription"
                ),

            level:
                getValue(
                    "programLevel"
                ),

            program_type:
                type,

            duration:
                getValue(
                    "programDuration"
                ),

            fee:
                Number(
                    getValue(
                        "programFee"
                    ) || 0
                ),

            technologies:
                technologies,

            status:
                getValue(
                    "programStatus"
                ) ||
                "ACTIVE",

            training_duration:
                type ===
                "TRAINING_AND_INTERNSHIP"
                    ? getValue(
                        "trainingDuration"
                    )
                    : null,

            internship_duration:
                getValue(
                    "internshipDuration"
                ) ||
                null,

            payment_model:
                paymentModel ||
                "FULL_ONLY",

            updated_at:
                new Date().toISOString()

        };

    }



    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateProgram(
        data
    ) {

        if (!data.name) {

            throw new Error(
                "Program name is required."
            );

        }


        if (!data.slug) {

            throw new Error(
                "Program slug is required."
            );

        }


        if (!data.category) {

            throw new Error(
                "Category is required."
            );

        }


        if (!data.level) {

            throw new Error(
                "Level is required."
            );

        }


        if (
            data.program_type !==
            "INTERNSHIP" &&
            data.program_type !==
            "TRAINING_AND_INTERNSHIP"
        ) {

            throw new Error(
                "Please select a valid program type."
            );

        }


        if (
            Number.isNaN(
                data.fee
            ) ||
            data.fee < 0
        ) {

            throw new Error(
                "Please enter a valid program fee."
            );

        }


        if (
            data.program_type ===
            "INTERNSHIP" &&
            !data.internship_duration
        ) {

            throw new Error(
                "Internship duration is required."
            );

        }


        if (
            data.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            if (
                !data.training_duration
            ) {

                throw new Error(
                    "Training duration is required."
                );

            }


            if (
                !data.internship_duration
            ) {

                throw new Error(
                    "Internship duration is required."
                );

            }

        }

    }



    /* =====================================================
       TOGGLE STATUS
    ===================================================== */

    async function toggleProgram(
        id
    ) {

        const program =
            programs.find(
                function (item) {

                    return String(
                        item.id
                    ) ===
                    String(
                        id
                    );

                }
            );


        if (!program) {
            return;
        }


        const newStatus =
            program.status ===
            "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";


        const confirmText =
            newStatus ===
            "ACTIVE"
                ? "Activate this program?"
                : "Deactivate this program?";


        if (
            !window.confirm(
                confirmText
            )
        ) {

            return;
        }


        try {

            const response =
                await window.supabaseClient
                    .from("programs")
                    .update(
                        {
                            status:
                                newStatus,

                            updated_at:
                                new Date().toISOString()
                        }
                    )
                    .eq(
                        "id",
                        program.id
                    );


            if (
                response.error
            ) {

                throw response.error;
            }


            showStatus(
                "Program " +
                newStatus.toLowerCase() +
                " successfully.",
                "success"
            );


            await loadPrograms();

        } catch (error) {

            console.error(
                error
            );


            showStatus(
                error.message ||
                "Program status could not be updated.",
                "error"
            );

        }

    }



    /* =====================================================
       MODAL
    ===================================================== */

    function openModal() {

        const modal =
            document.getElementById(
                "programModal"
            );


        if (!modal) {

            console.error(
                "NITRIXA: programModal not found."
            );

            return;
        }


        modal.hidden =
            false;


        document.body.style.overflow =
            "hidden";

    }


    function closeModal() {

        const modal =
            document.getElementById(
                "programModal"
            );


        if (modal) {

            modal.hidden =
                true;

        }


        document.body.style.overflow =
            "";

    }



    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logoutAdmin() {

        try {

            await window.supabaseClient
                .auth
                .signOut();

        } finally {

            window.location.href =
                "login.html";

        }

    }



    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {

        const loading =
            document.getElementById(
                "programsLoadingState"
            );


        const table =
            document.getElementById(
                "programsTableWrapper"
            );


        const empty =
            document.getElementById(
                "programsEmptyState"
            );


        if (loading) {
            loading.hidden =
                false;
        }


        if (table) {
            table.hidden =
                true;
        }


        if (empty) {
            empty.hidden =
                true;
        }

    }


    function hideLoading() {

        const loading =
            document.getElementById(
                "programsLoadingState"
            );


        if (loading) {

            loading.hidden =
                true;

        }

    }



    /* =====================================================
       HELPERS
    ===================================================== */

    function getValue(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {
            return "";
        }


        return String(
            element.value ||
            ""
        ).trim();

    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value === null ||
                typeof value ===
                "undefined"
                    ? ""
                    : value;

        }

    }


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
                value;

        }

    }


    function formatProgramType(
        type
    ) {

        if (
            type ===
            "INTERNSHIP"
        ) {

            return "Internship";

        }


        if (
            type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return "Training + Internship";

        }


        return type ||
            "Program";

    }


    function getProgramDuration(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return (
                escapeHtml(
                    program.training_duration ||
                    "—"
                ) +
                " + " +
                escapeHtml(
                    program.internship_duration ||
                    "—"
                )
            );

        }


        return escapeHtml(
            program.internship_duration ||
            program.duration ||
            "—"
        );

    }


    function getPaymentLabel(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return "Full Only";

        }


        if (
            program.payment_model ===
            "FULL_AND_INSTALLMENT"
        ) {

            return "Full + Installment";

        }


        return "Full Only";

    }


    function normalizeTechnologies(
        technologies
    ) {

        if (
            Array.isArray(
                technologies
            )
        ) {

            return technologies
                .map(
                    function (item) {

                        return String(
                            item
                        ).trim();

                    }
                )
                .filter(
                    Boolean
                );

        }


        if (
            typeof technologies ===
            "string"
        ) {

            return technologies
                .split(",")
                .map(
                    function (item) {

                        return item.trim();

                    }
                )
                .filter(
                    Boolean
                );

        }


        return [];

    }


    function escapeHtml(
        value
    ) {

        return String(
            value === null ||
            typeof value ===
            "undefined"
                ? ""
                : value
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
       STATUS MESSAGE
    ===================================================== */

    function showStatus(
        message,
        type
    ) {

        const element =
            document.getElementById(
                "programStatusMessage"
            );


        if (!element) {
            return;
        }


        element.textContent =
            message;


        element.className =
            "np-status " +
            (
                type ===
                "success"
                    ? "success"
                    : "error"
            );


        element.hidden =
            false;


        clearTimeout(
            showStatus.timer
        );


        showStatus.timer =
            setTimeout(
                function () {

                    element.hidden =
                        true;

                },
                7000
            );

    }

})();