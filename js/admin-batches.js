/* =========================================================
   NITRIXA TECHNOLOGIES

   ADMIN BATCHES MANAGEMENT
   ========================================================= */


document.addEventListener("DOMContentLoaded", async () => {


    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */


    const batchesTableBody =
        document.getElementById("batchesTableBody");


    const totalBatches =
        document.getElementById("totalBatches");


    const activeBatches =
        document.getElementById("activeBatches");


    const completedBatches =
        document.getElementById("completedBatches");


    const batchSearch =
        document.getElementById("batchSearch");


    const programFilter =
        document.getElementById("programFilter");


    const statusFilter =
        document.getElementById("statusFilter");


    const refreshBatchesButton =
        document.getElementById("refreshBatchesButton");


    const addBatchButton =
        document.getElementById("addBatchButton");


    const logoutButton =
        document.getElementById("logoutButton");


    const batchModal =
        document.getElementById("batchModal");


    const closeBatchModal =
        document.getElementById("closeBatchModal");


    const cancelBatchButton =
        document.getElementById("cancelBatchButton");


    const batchForm =
        document.getElementById("batchForm");


    const batchModalTitle =
        document.getElementById("batchModalTitle");


    const saveBatchButton =
        document.getElementById("saveBatchButton");


    const formMessage =
        document.getElementById("formMessage");


    const modalFormMessage =
        document.getElementById("modalFormMessage");


    const adminToast =
        document.getElementById("adminToast");


    /* =====================================================
       ASSIGNMENT ELEMENTS
       ===================================================== */


    const assignmentModal =
        document.getElementById("assignmentModal");


    const closeAssignmentModal =
        document.getElementById("closeAssignmentModal");


    const cancelAssignmentButton =
        document.getElementById("cancelAssignmentButton");


    const saveAssignmentButton =
        document.getElementById("saveAssignmentButton");


    const selectAllAssignmentButton =
        document.getElementById("selectAllAssignmentButton");


    const clearAssignmentButton =
        document.getElementById("clearAssignmentButton");


    const assignmentList =
        document.getElementById("assignmentList");


    const assignmentFormMessage =
        document.getElementById("assignmentFormMessage");


    const assignmentCapacity =
        document.getElementById("assignmentCapacity");


    const assignmentAssigned =
        document.getElementById("assignmentAssigned");


    const assignmentAvailable =
        document.getElementById("assignmentAvailable");


    const assignmentSelectionCount =
        document.getElementById("assignmentSelectionCount");


    const assignmentModalTitle =
        document.getElementById("assignmentModalTitle");


    const assignmentModalDescription =
        document.getElementById(
            "assignmentModalDescription"
        );


    /* =====================================================
       FORM ELEMENTS
       ===================================================== */


    const batchProgram =
        document.getElementById("batchProgram");


    const batchName =
        document.getElementById("batchName");


    const batchCode =
        document.getElementById("batchCode");


    const batchStartDate =
        document.getElementById("batchStartDate");


    const batchEndDate =
        document.getElementById("batchEndDate");


    const batchCapacity =
        document.getElementById("batchCapacity");


    const batchStatus =
        document.getElementById("batchStatus");


    const batchDescription =
        document.getElementById("batchDescription");


    /* =====================================================
       STATE
       ===================================================== */


    let batches = [];

    let programs = [];

    let editingBatchId = null;

    let assignmentBatch = null;

    let assignmentEnrollments = [];


    /* =====================================================
       SUPABASE CHECK
       ===================================================== */


    if (!window.supabase || !supabaseClient) {


        showPageMessage(
            "Supabase could not be initialized. Please check the Supabase configuration.",
            "error"
        );


        return;

    }


    /* =====================================================
       AUTH CHECK
       ===================================================== */


    const authorized =
        await checkAdminAccess();


    if (!authorized) {

        return;

    }


    /* =====================================================
       INITIAL DATA LOAD
       ===================================================== */


    await loadPrograms();

    await loadBatches();


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */


    addBatchButton.addEventListener(
        "click",
        () => openBatchModal()
    );


    closeBatchModal.addEventListener(
        "click",
        closeBatchModalHandler
    );


    cancelBatchButton.addEventListener(
        "click",
        closeBatchModalHandler
    );


    batchModal.addEventListener(
        "click",
        (event) => {

            if (event.target === batchModal) {

                closeBatchModalHandler();

            }

        }
    );


    batchForm.addEventListener(
        "submit",
        saveBatch
    );


    batchSearch.addEventListener(
        "input",
        renderBatches
    );


    programFilter.addEventListener(
        "change",
        renderBatches
    );


    statusFilter.addEventListener(
        "change",
        renderBatches
    );


    refreshBatchesButton.addEventListener(
        "click",
        async () => {

            refreshBatchesButton.disabled = true;

            await loadPrograms();

            await loadBatches();

            refreshBatchesButton.disabled = false;

        }
    );


    logoutButton.addEventListener(
        "click",
        logoutAdmin
    );


    closeAssignmentModal.addEventListener(
        "click",
        closeAssignmentModalHandler
    );


    cancelAssignmentButton.addEventListener(
        "click",
        closeAssignmentModalHandler
    );


    assignmentModal.addEventListener(
        "click",
        (event) => {

            if (event.target === assignmentModal) {

                closeAssignmentModalHandler();

            }

        }
    );


    selectAllAssignmentButton.addEventListener(
        "click",
        selectAllAssignments
    );


    clearAssignmentButton.addEventListener(
        "click",
        clearAssignmentSelections
    );


    saveAssignmentButton.addEventListener(
        "click",
        saveAssignments
    );


    document.addEventListener(
        "keydown",
        (event) => {


            if (event.key !== "Escape") {

                return;

            }


            if (
                assignmentModal.classList.contains(
                    "open"
                )
            ) {

                closeAssignmentModalHandler();

                return;

            }


            if (
                batchModal.classList.contains(
                    "open"
                )
            ) {

                closeBatchModalHandler();

            }

        }
    );


    /* =====================================================
       ADMIN AUTHORIZATION
       ===================================================== */


    async function checkAdminAccess() {


        try {


            const {
                data: sessionData,
                error: sessionError
            } = await supabaseClient.auth.getSession();


            if (sessionError) {

                throw sessionError;

            }


            const session =
                sessionData?.session;


            if (!session) {


                window.location.href =
                    "login.html";


                return false;

            }


            const {
                data: isAdmin,
                error: adminError
            } = await supabaseClient.rpc(
                "is_admin"
            );


            if (adminError) {

                throw adminError;

            }


            if (!isAdmin) {


                await supabaseClient.auth.signOut();


                window.location.href =
                    "login.html";


                return false;

            }


            return true;


        } catch (error) {


            console.error(
                "NITRIXA Admin Authorization Error:",
                error
            );


            window.location.href =
                "login.html";


            return false;

        }

    }


    /* =====================================================
       LOAD PROGRAMS
       ===================================================== */


    async function loadPrograms() {


        try {


            const {
                data,
                error
            } = await supabaseClient
                .from("programs")
                .select(
                    "id,name,status"
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


            if (error) {

                throw error;

            }


            programs =
                Array.isArray(data)
                    ? data
                    : [];


            populateProgramFilters();


        } catch (error) {


            console.error(
                "NITRIXA Programs Load Error:",
                error
            );


            showPageMessage(
                "Programs could not be loaded.",
                "error"
            );

        }

    }


    /* =====================================================
       PROGRAM FILTERS
       ===================================================== */


    function populateProgramFilters() {


        const currentFilter =
            programFilter.value;


        programFilter.innerHTML = `

            <option value="ALL">

                All Programs

            </option>

        `;


        programs.forEach((program) => {


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                program.id;


            option.textContent =
                program.name;


            programFilter.appendChild(option);

        });


        if (
            currentFilter &&
            programs.some(
                (program) =>
                    program.id === currentFilter
            )
        ) {

            programFilter.value =
                currentFilter;

        }


        const currentModalProgram =
            batchProgram.value;


        batchProgram.innerHTML = `

            <option value="">

                Select Program

            </option>

        `;


        programs
            .filter(
                (program) =>
                    program.status === "ACTIVE"
            )
            .forEach((program) => {


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    program.id;


                option.textContent =
                    program.name;


                batchProgram.appendChild(
                    option
                );

            });


        if (
            currentModalProgram &&
            programs.some(
                (program) =>
                    program.id ===
                        currentModalProgram &&
                    program.status ===
                        "ACTIVE"
            )
        ) {

            batchProgram.value =
                currentModalProgram;

        }

    }


    /* =====================================================
       LOAD BATCHES
       ===================================================== */


    async function loadBatches() {


        showLoadingState();


        try {


            const {
                data,
                error
            } = await supabaseClient
                .from("batches")
                .select(`

                    id,

                    program_id,

                    name,

                    batch_code,

                    start_date,

                    end_date,

                    capacity,

                    status,

                    description,

                    created_at,

                    updated_at,

                    programs (

                        id,

                        name

                    )

                `)
                .order(
                    "start_date",
                    {
                        ascending: true
                    }
                );


            if (error) {

                throw error;

            }


            batches =
                Array.isArray(data)
                    ? data
                    : [];


            updateStats();

            renderBatches();


        } catch (error) {


            console.error(
                "NITRIXA Batches Load Error:",
                error
            );


            showPageMessage(
                "Batches could not be loaded. Please refresh and try again.",
                "error"
            );

        }

    }


    /* =====================================================
       RENDER
       ===================================================== */


    function renderBatches() {


        const search =
            batchSearch.value
                .trim()
                .toLowerCase();


        const selectedProgram =
            programFilter.value;


        const selectedStatus =
            statusFilter.value;


        const filteredBatches =
            batches.filter((batch) => {


                const programName =
                    batch.programs?.name || "";


                const matchesSearch =
                    !search ||
                    batch.name
                        ?.toLowerCase()
                        .includes(search) ||
                    batch.batch_code
                        ?.toLowerCase()
                        .includes(search) ||
                    programName
                        .toLowerCase()
                        .includes(search);


                const matchesProgram =
                    selectedProgram === "ALL" ||
                    batch.program_id ===
                        selectedProgram;


                const matchesStatus =
                    selectedStatus === "ALL" ||
                    batch.status ===
                        selectedStatus;


                return (
                    matchesSearch &&
                    matchesProgram &&
                    matchesStatus
                );

            });


        if (filteredBatches.length === 0) {


            batchesTableBody.innerHTML = `

                <tr>

                    <td colspan="6">

                        <div class="admin-state">

                            <p class="admin-state-title">

                                No batches found

                            </p>

                            <p class="admin-state-text">

                                Create a batch or change the selected filters.

                            </p>

                        </div>

                    </td>

                </tr>

            `;


            return;

        }


        batchesTableBody.innerHTML =
            filteredBatches
                .map(
                    (batch) =>
                        createBatchRow(batch)
                )
                .join("");


        attachBatchRowEvents();

    }


    /* =====================================================
       CREATE ROW
       ===================================================== */


    function createBatchRow(batch) {


        const programName =
            batch.programs?.name ||
            "Unknown Program";


        const statusClass =
            getStatusClass(
                batch.status
            );


        const statusLabel =
            formatStatus(
                batch.status
            );


        return `

            <tr>


                <td>


                    <p class="program-name">

                        ${escapeHtml(batch.name)}

                    </p>


                    <span class="batch-code">

                        ${escapeHtml(
                            batch.batch_code
                        )}

                    </span>


                </td>


                <td>


                    <span class="program-meta">

                        ${escapeHtml(
                            programName
                        )}

                    </span>


                </td>


                <td>


                    <span class="batch-date">

                        ${formatDate(
                            batch.start_date
                        )}

                    </span>


                    <span class="batch-date-end">

                        to ${formatDate(
                            batch.end_date
                        )}

                    </span>


                </td>


                <td>


                    <span class="capacity-value">

                        ${Number(
                            batch.capacity
                        )}

                    </span>


                    <span class="capacity-label">

                        interns

                    </span>


                </td>


                <td>


                    <span
                        class="admin-status ${statusClass}"
                    >

                        ${statusLabel}

                    </span>


                </td>


                <td>


                    <div class="admin-actions">


                        <button
                            type="button"
                            class="admin-btn admin-btn-secondary admin-btn-small"
                            data-action="edit"
                            data-id="${batch.id}"
                        >

                            Edit

                        </button>


                        <button
                            type="button"
                            class="admin-btn ${
                                batch.status ===
                                "ACTIVE"
                                    ? "admin-btn-danger"
                                    : "admin-btn-primary"
                            } admin-btn-small"
                            data-action="toggle"
                            data-id="${batch.id}"
                        >

                            ${
                                batch.status ===
                                "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"
                            }

                        </button>


                        <button
                            type="button"
                            class="admin-btn admin-btn-primary admin-btn-small"
                            data-action="assign"
                            data-id="${batch.id}"
                        >

                            Assign Interns

                        </button>


                    </div>


                </td>


            </tr>

        `;

    }


    /* =====================================================
       ROW EVENTS
       ===================================================== */


    function attachBatchRowEvents() {


        const buttons =
            batchesTableBody.querySelectorAll(
                "[data-action]"
            );


        buttons.forEach((button) => {


            button.addEventListener(
                "click",
                async () => {


                    const action =
                        button.dataset.action;


                    const id =
                        button.dataset.id;


                    const batch =
                        batches.find(
                            (item) =>
                                item.id === id
                        );


                    if (!batch) {

                        return;

                    }


                    if (action === "edit") {


                        openBatchModal(
                            batch
                        );


                        return;

                    }


                    if (action === "toggle") {


                        await toggleBatch(
                            batch
                        );


                        return;

                    }


                    if (action === "assign") {


                        await openAssignmentModal(
                            batch
                        );

                    }

                }

            );

        });

    }


    /* =====================================================
       ASSIGNMENT MODAL
       ===================================================== */


    async function openAssignmentModal(
        batch
    ) {


        assignmentBatch =
            batch;


        assignmentEnrollments =
            [];


        clearAssignmentMessage();


        assignmentModalTitle.textContent =
            `Assign Interns — ${
                batch.name || "Batch"
            }`;


        assignmentModalDescription.textContent =
            `${
                batch.programs?.name ||
                "Program"
            } • ${
                batch.batch_code || ""
            }`;


        assignmentCapacity.textContent =
            Number(
                batch.capacity || 0
            );


        assignmentAssigned.textContent =
            "0";


        assignmentAvailable.textContent =
            Number(
                batch.capacity || 0
            );


        assignmentSelectionCount.textContent =
            "0 selected";


        assignmentList.innerHTML = `

            <div class="assignment-empty">

                Loading eligible enrollments...

            </div>

        `;


        saveAssignmentButton.disabled =
            true;


        selectAllAssignmentButton.disabled =
            true;


        clearAssignmentButton.disabled =
            true;


        assignmentModal.classList.add(
            "open"
        );


        assignmentModal.setAttribute(
            "aria-hidden",
            "false"
        );


        try {


            const {
                data,
                error
            } = await supabaseClient.rpc(
                "admin_get_batch_enrollments",
                {
                    p_batch_id:
                        batch.id
                }
            );


            if (error) {

                throw error;

            }


            assignmentEnrollments =
                Array.isArray(data)
                    ? data
                    : [];


            renderAssignmentList();


        } catch (error) {


            console.error(
                "NITRIXA Batch Enrollment Load Error:",
                error
            );


            assignmentList.innerHTML = `

                <div class="assignment-empty">

                    Eligible enrollments could not be loaded.
                    Please refresh and try again.

                </div>

            `;


            showAssignmentMessage(
                error?.message ||
                "Unable to load eligible enrollments.",
                "error"
            );


        } finally {


            selectAllAssignmentButton.disabled =
                assignmentEnrollments.length ===
                0;


            clearAssignmentButton.disabled =
                assignmentEnrollments.length ===
                0;

        }

    }


    function renderAssignmentList() {


        const capacity =
            Number(
                assignmentBatch?.capacity || 0
            );


        const assigned =
            assignmentEnrollments.filter(
                (item) =>
                    item.batch_id ===
                    assignmentBatch.id
            ).length;


        const available =
            Math.max(
                capacity - assigned,
                0
            );


        assignmentCapacity.textContent =
            capacity;


        assignmentAssigned.textContent =
            assigned;


        assignmentAvailable.textContent =
            available;


        if (
            assignmentEnrollments.length ===
            0
        ) {


            assignmentList.innerHTML = `

                <div class="assignment-empty">

                    No active enrollments are available
                    for this program.

                </div>

            `;


            saveAssignmentButton.disabled =
                true;


            updateAssignmentSelectionCount();


            return;

        }


        assignmentList.innerHTML =
            assignmentEnrollments
                .map(
                    (item) => {


                        const alreadyAssigned =
                            item.batch_id ===
                            assignmentBatch.id;


                        const currentBatch =
                            item.current_batch_name ||
                            "Not assigned";


                        const title =
                            item.intern_id ||
                            `Enrollment ${
                                item.enrollment_id
                            }`;


                        return `

                            <label class="assignment-item">


                                <input
                                    type="checkbox"
                                    class="assignment-checkbox"
                                    value="${escapeHtml(
                                        item.enrollment_id
                                    )}"
                                    ${
                                        alreadyAssigned
                                            ? "checked disabled"
                                            : ""
                                    }
                                >


                                <span
                                    class="assignment-item-content"
                                >


                                    <span
                                        class="assignment-item-title"
                                    >

                                        ${escapeHtml(
                                            title
                                        )}

                                    </span>


                                    <span
                                        class="assignment-item-meta"
                                    >

                                        Enrollment:
                                        ${escapeHtml(
                                            item.enrollment_id
                                        )}

                                        <br>

                                        Current Batch:
                                        ${escapeHtml(
                                            currentBatch
                                        )}

                                    </span>


                                </span>


                            </label>

                        `;

                    }
                )
                .join("");


        assignmentList
            .querySelectorAll(
                ".assignment-checkbox"
            )
            .forEach(
                (checkbox) => {

                    checkbox.addEventListener(
                        "change",
                        updateAssignmentSelectionCount
                    );

                }
            );


        updateAssignmentSelectionCount();

    }


    function getSelectedAssignmentIds() {


        return Array.from(

            assignmentList.querySelectorAll(
                ".assignment-checkbox:checked:not(:disabled)"
            )

        ).map(
            (checkbox) =>
                checkbox.value
        );

    }


    function updateAssignmentSelectionCount() {


        const selected =
            getSelectedAssignmentIds().length;


        assignmentSelectionCount.textContent =
            `${selected} selected`;


        const capacity =
            Number(
                assignmentBatch?.capacity || 0
            );


        const assigned =
            assignmentEnrollments.filter(
                (item) =>
                    item.batch_id ===
                    assignmentBatch?.id
            ).length;


        const available =
            Math.max(
                capacity - assigned,
                0
            );


        assignmentAvailable.textContent =
            available;


        saveAssignmentButton.disabled =
            available <= 0 ||
            selected === 0;

    }


    function selectAllAssignments() {


        const capacity =
            Number(
                assignmentBatch?.capacity || 0
            );


        const assigned =
            assignmentEnrollments.filter(
                (item) =>
                    item.batch_id ===
                    assignmentBatch?.id
            ).length;


        const available =
            Math.max(
                capacity - assigned,
                0
            );


        Array.from(

            assignmentList.querySelectorAll(
                ".assignment-checkbox:not(:disabled)"
            )

        ).forEach(
            (checkbox, index) => {

                checkbox.checked =
                    index < available;

            }
        );


        updateAssignmentSelectionCount();

    }


    function clearAssignmentSelections() {


        assignmentList
            .querySelectorAll(
                ".assignment-checkbox:not(:disabled)"
            )
            .forEach(
                (checkbox) => {

                    checkbox.checked =
                        false;

                }
            );


        updateAssignmentSelectionCount();

    }


    async function saveAssignments() {


        if (!assignmentBatch) {

            return;

        }


        const selectedIds =
            getSelectedAssignmentIds();


        if (!selectedIds.length) {


            showAssignmentMessage(
                "Please select at least one intern.",
                "error"
            );


            return;

        }


        const capacity =
            Number(
                assignmentBatch.capacity || 0
            );


        const assigned =
            assignmentEnrollments.filter(
                (item) =>
                    item.batch_id ===
                    assignmentBatch.id
            ).length;


        const available =
            Math.max(
                capacity - assigned,
                0
            );


        if (
            selectedIds.length >
            available
        ) {


            showAssignmentMessage(
                `Only ${available} seat(s) are available in this batch.`,
                "error"
            );


            return;

        }


        saveAssignmentButton.disabled =
            true;


        saveAssignmentButton.textContent =
            "Assigning...";


        clearAssignmentMessage();


        try {


            for (
                const enrollmentId
                of selectedIds
            ) {


                const {
                    error
                } = await supabaseClient.rpc(
                    "admin_assign_enrollment_to_batch",
                    {
                        p_enrollment_id:
                            enrollmentId,

                        p_batch_id:
                            assignmentBatch.id
                    }
                );


                if (error) {

                    throw error;

                }

            }


            showToast(
                `${selectedIds.length} intern(s) assigned successfully.`,
                "success"
            );


            closeAssignmentModalHandler();


        } catch (error) {


            console.error(
                "NITRIXA Batch Assignment Error:",
                error
            );


            showAssignmentMessage(
                error?.message ||
                "Intern assignment failed. Please try again.",
                "error"
            );


            saveAssignmentButton.disabled =
                false;

        } finally {


            saveAssignmentButton.textContent =
                "Assign Selected";

        }

    }


    function closeAssignmentModalHandler() {


        assignmentModal.classList.remove(
            "open"
        );


        assignmentModal.setAttribute(
            "aria-hidden",
            "true"
        );


        assignmentBatch =
            null;


        assignmentEnrollments =
            [];


        clearAssignmentMessage();

    }


    function showAssignmentMessage(
        message,
        type
    ) {


        assignmentFormMessage.textContent =
            message;


        assignmentFormMessage.className =
            `admin-form-message ${type}`;


        assignmentFormMessage.style.display =
            "block";

    }


    function clearAssignmentMessage() {


        assignmentFormMessage.textContent =
            "";


        assignmentFormMessage.className =
            "admin-form-message";


        assignmentFormMessage.style.display =
            "none";

    }


    /* =====================================================
       OPEN MODAL
       ===================================================== */


    function openBatchModal(
        batch = null
    ) {


        clearModalMessage();


        populateProgramFilters();


        if (batch) {


            editingBatchId =
                batch.id;


            batchModalTitle.textContent =
                "Edit Batch";


            saveBatchButton.textContent =
                "Update Batch";


            batchProgram.value =
                batch.program_id || "";


            batchName.value =
                batch.name || "";


            batchCode.value =
                batch.batch_code || "";


            batchStartDate.value =
                batch.start_date || "";


            batchEndDate.value =
                batch.end_date || "";


            batchCapacity.value =
                Number(
                    batch.capacity || 30
                );


            batchStatus.value =
                batch.status ||
                "ACTIVE";


            batchDescription.value =
                batch.description ||
                "";


        } else {


            editingBatchId =
                null;


            batchModalTitle.textContent =
                "Add Batch";


            saveBatchButton.textContent =
                "Save Batch";


            batchForm.reset();


            batchCapacity.value =
                "30";


            batchStatus.value =
                "ACTIVE";

        }


        batchModal.classList.add(
            "open"
        );


        batchModal.setAttribute(
            "aria-hidden",
            "false"
        );


        setTimeout(
            () => {

                batchProgram.focus();

            },
            50
        );

    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */


    function closeBatchModalHandler() {


        batchModal.classList.remove(
            "open"
        );


        batchModal.setAttribute(
            "aria-hidden",
            "true"
        );


        clearModalMessage();


        editingBatchId =
            null;

    }


    /* =====================================================
       SAVE BATCH
       ===================================================== */


    async function saveBatch(event) {


        event.preventDefault();


        clearModalMessage();


        const programId =
            batchProgram.value;


        const name =
            batchName.value.trim();


        const code =
            batchCode.value
                .trim()
                .toUpperCase();


        const startDate =
            batchStartDate.value;


        const endDate =
            batchEndDate.value;


        const capacity =
            Number(
                batchCapacity.value
            );


        const status =
            batchStatus.value;


        const description =
            batchDescription.value.trim();


        if (!programId) {


            showModalMessage(
                "Please select a program.",
                "error"
            );


            batchProgram.focus();


            return;

        }


        if (!name) {


            showModalMessage(
                "Batch name is required.",
                "error"
            );


            batchName.focus();


            return;

        }


        if (!code) {


            showModalMessage(
                "Batch code is required.",
                "error"
            );


            batchCode.focus();


            return;

        }


        if (
            !startDate ||
            !endDate
        ) {


            showModalMessage(
                "Start date and end date are required.",
                "error"
            );


            return;

        }


        if (
            endDate <
            startDate
        ) {


            showModalMessage(
                "End date cannot be before the start date.",
                "error"
            );


            batchEndDate.focus();


            return;

        }


        if (
            Number.isNaN(capacity) ||
            capacity < 1
        ) {


            showModalMessage(
                "Capacity must be at least 1.",
                "error"
            );


            batchCapacity.focus();


            return;

        }


        saveBatchButton.disabled =
            true;


        saveBatchButton.textContent =
            editingBatchId
                ? "Updating..."
                : "Saving...";


        try {


            const batchData = {


                program_id:
                    programId,


                name,


                batch_code:
                    code,


                start_date:
                    startDate,


                end_date:
                    endDate,


                capacity,


                status,


                description:
                    description ||
                    null

            };


            if (editingBatchId) {


                const {
                    error
                } = await supabaseClient
                    .from("batches")
                    .update(
                        batchData
                    )
                    .eq(
                        "id",
                        editingBatchId
                    );


                if (error) {

                    throw error;

                }


                showToast(
                    "Batch updated successfully.",
                    "success"
                );


            } else {


                const {
                    error
                } = await supabaseClient
                    .from("batches")
                    .insert(
                        batchData
                    );


                if (error) {

                    throw error;

                }


                showToast(
                    "Batch created successfully.",
                    "success"
                );

            }


            closeBatchModalHandler();


            await loadBatches();


        } catch (error) {


            console.error(
                "NITRIXA Batch Save Error:",
                error
            );


            let message =
                "Batch could not be saved. Please try again.";


            if (
                error?.code ===
                "23505"
            ) {


                message =
                    "This batch code already exists. Please use a unique code.";

            }


            showModalMessage(
                message,
                "error"
            );


        } finally {


            saveBatchButton.disabled =
                false;


            saveBatchButton.textContent =
                editingBatchId
                    ? "Update Batch"
                    : "Save Batch";

        }

    }


    /* =====================================================
       TOGGLE BATCH
       ===================================================== */


    async function toggleBatch(
        batch
    ) {


        let newStatus;


        if (
            batch.status ===
            "ACTIVE"
        ) {


            newStatus =
                "INACTIVE";


        } else {


            newStatus =
                "ACTIVE";

        }


        try {


            const {
                error
            } = await supabaseClient
                .from("batches")
                .update({
                    status:
                        newStatus
                })
                .eq(
                    "id",
                    batch.id
                );


            if (error) {

                throw error;

            }


            showToast(
                newStatus === "ACTIVE"
                    ? "Batch activated."
                    : "Batch deactivated.",
                "success"
            );


            await loadBatches();


        } catch (error) {


            console.error(
                "NITRIXA Batch Status Error:",
                error
            );


            showToast(
                "Batch status could not be updated.",
                "error"
            );

        }

    }


    /* =====================================================
       STATS
       ===================================================== */


    function updateStats() {


        const total =
            batches.length;


        const active =
            batches.filter(
                (batch) =>
                    batch.status ===
                    "ACTIVE"
            ).length;


        const completed =
            batches.filter(
                (batch) =>
                    batch.status ===
                    "COMPLETED"
            ).length;


        totalBatches.textContent =
            total;


        activeBatches.textContent =
            active;


        completedBatches.textContent =
            completed;

    }


    /* =====================================================
       LOADING
       ===================================================== */


    function showLoadingState() {


        batchesTableBody.innerHTML = `

            <tr>


                <td colspan="6">


                    <div class="admin-state">


                        <div class="admin-spinner"></div>


                        <p class="admin-state-title">

                            Loading batches...

                        </p>


                        <p class="admin-state-text">

                            Please wait while batch data is loaded.

                        </p>


                    </div>


                </td>


            </tr>

        `;

    }


    /* =====================================================
       PAGE MESSAGE
       ===================================================== */


    function showPageMessage(
        message,
        type
    ) {


        formMessage.textContent =
            message;


        formMessage.className =
            `admin-form-message ${type}`;


        formMessage.style.display =
            "block";

    }


    /* =====================================================
       MODAL MESSAGE
       ===================================================== */


    function showModalMessage(
        message,
        type
    ) {


        modalFormMessage.textContent =
            message;


        modalFormMessage.className =
            `admin-form-message ${type}`;


        modalFormMessage.style.display =
            "block";

    }


    function clearModalMessage() {


        modalFormMessage.textContent =
            "";


        modalFormMessage.className =
            "admin-form-message";


        modalFormMessage.style.display =
            "none";

    }


    /* =====================================================
       TOAST
       ===================================================== */


    let toastTimer = null;


    function showToast(
        message,
        type = "success"
    ) {


        clearTimeout(
            toastTimer
        );


        adminToast.textContent =
            message;


        adminToast.className =
            `admin-toast ${type} show`;


        toastTimer =
            setTimeout(
                () => {


                    adminToast.className =
                        "admin-toast";


                },
                2800
            );

    }


    /* =====================================================
       LOGOUT
       ===================================================== */


    async function logoutAdmin() {


        logoutButton.disabled =
            true;


        logoutButton.textContent =
            "Logging out...";


        try {


            await supabaseClient.auth.signOut();


        } finally {


            window.location.href =
                "login.html";

        }

    }


    /* =====================================================
       FORMATTERS
       ===================================================== */


    function formatDate(
        dateValue
    ) {


        if (!dateValue) {

            return "—";

        }


        const date =
            new Date(
                `${dateValue}T00:00:00`
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return dateValue;

        }


        return new Intl.DateTimeFormat(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);

    }


    function formatStatus(
        status
    ) {


        const map = {


            ACTIVE:
                "Active",


            INACTIVE:
                "Inactive",


            COMPLETED:
                "Completed"

        };


        return map[status] ||
            status ||
            "Unknown";

    }


    function getStatusClass(
        status
    ) {


        if (
            status ===
            "ACTIVE"
        ) {

            return "admin-status-active";

        }


        if (
            status ===
            "COMPLETED"
        ) {

            return "admin-status-active";

        }


        return "admin-status-inactive";

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


});