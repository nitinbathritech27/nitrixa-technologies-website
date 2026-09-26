/* =========================================================
   NITRIXA TECHNOLOGIES
   ADMIN PROGRAMS MANAGEMENT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const programsTableBody =
        document.getElementById("programsTableBody");

    const totalPrograms =
        document.getElementById("totalPrograms");

    const activePrograms =
        document.getElementById("activePrograms");

    const inactivePrograms =
        document.getElementById("inactivePrograms");

    const programSearch =
        document.getElementById("programSearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const refreshProgramsButton =
        document.getElementById("refreshProgramsButton");

    const addProgramButton =
        document.getElementById("addProgramButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const programModal =
        document.getElementById("programModal");

    const closeProgramModal =
        document.getElementById("closeProgramModal");

    const cancelProgramButton =
        document.getElementById("cancelProgramButton");

    const programForm =
        document.getElementById("programForm");

    const programModalTitle =
        document.getElementById("programModalTitle");

    const saveProgramButton =
        document.getElementById("saveProgramButton");

    const formMessage =
        document.getElementById("formMessage");

    const modalFormMessage =
        document.getElementById("modalFormMessage");

    const adminToast =
        document.getElementById("adminToast");


    /* =====================================================
       FORM ELEMENTS
       ===================================================== */

    const programName =
        document.getElementById("programName");

    const programCategory =
        document.getElementById("programCategory");

    const programLevel =
        document.getElementById("programLevel");

    const programType =
        document.getElementById("programType");

    const programDuration =
        document.getElementById("programDuration");

    const programFee =
        document.getElementById("programFee");

    const programTechnologies =
        document.getElementById("programTechnologies");

    const programDescription =
        document.getElementById("programDescription");

    const programActive =
        document.getElementById("programActive");


    /* =====================================================
       STATE
       ===================================================== */

    let programs = [];

    let editingProgramId = null;


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
       INITIAL AUTHORIZATION
       ===================================================== */

    const authorized =
        await checkAdminAccess();

    if (!authorized) {
        return;
    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    await loadPrograms();


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    addProgramButton.addEventListener(
        "click",
        () => openProgramModal()
    );


    closeProgramModal.addEventListener(
        "click",
        closeProgramModalHandler
    );


    cancelProgramButton.addEventListener(
        "click",
        closeProgramModalHandler
    );


    programModal.addEventListener(
        "click",
        (event) => {

            if (event.target === programModal) {
                closeProgramModalHandler();
            }

        }
    );


    programForm.addEventListener(
        "submit",
        saveProgram
    );


    programSearch.addEventListener(
        "input",
        renderPrograms
    );


    statusFilter.addEventListener(
        "change",
        renderPrograms
    );


    refreshProgramsButton.addEventListener(
        "click",
        async () => {

            refreshProgramsButton.disabled = true;

            await loadPrograms();

            refreshProgramsButton.disabled = false;
        }
    );


    logoutButton.addEventListener(
        "click",
        logoutAdmin
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                programModal.classList.contains("open")
            ) {
                closeProgramModalHandler();
            }

        }
    );


    /* =====================================================
       CHECK ADMIN ACCESS
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

        showLoadingState();

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from("programs")
                .select(
                    "id,name,slug,category,description,level,program_type,duration,fee,technologies,status,created_at,updated_at"
                )
                .order(
                    "created_at",
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


            updateStats();

            renderPrograms();

        } catch (error) {

            console.error(
                "NITRIXA Programs Load Error:",
                error
            );

            showPageMessage(
                "Programs could not be loaded. Please refresh and try again.",
                "error"
            );

        }
    }


    /* =====================================================
       RENDER PROGRAMS
       ===================================================== */

    function renderPrograms() {

        const search =
            programSearch.value
                .trim()
                .toLowerCase();


        const selectedStatus =
            statusFilter.value;


        const filteredPrograms =
            programs.filter((program) => {

                const matchesSearch =
                    !search ||
                    program.name
                        ?.toLowerCase()
                        .includes(search) ||
                    program.category
                        ?.toLowerCase()
                        .includes(search) ||
                    program.program_type
                        ?.toLowerCase()
                        .includes(search);


                const matchesStatus =
                    selectedStatus === "ALL" ||
                    program.status === selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );
            });


        if (filteredPrograms.length === 0) {

            programsTableBody.innerHTML = `
                <tr>
                    <td colspan="8">

                        <div class="admin-state">

                            <p class="admin-state-title">
                                No programs found
                            </p>

                            <p class="admin-state-text">
                                Try changing the search or status filter,
                                or add a new program.
                            </p>

                        </div>

                    </td>
                </tr>
            `;

            return;
        }


        programsTableBody.innerHTML =
            filteredPrograms
                .map(
                    (program) =>
                        createProgramRow(program)
                )
                .join("");


        attachProgramRowEvents();
    }


    /* =====================================================
       CREATE PROGRAM ROW
       ===================================================== */

    function createProgramRow(program) {

        const technologies =
            Array.isArray(program.technologies)
                ? program.technologies
                : [];


        const technologyHtml =
            technologies.length
                ? technologies
                    .map(
                        (technology) =>
                            `<span class="program-tech">${escapeHtml(technology)}</span>`
                    )
                    .join("")
                : `<span class="program-meta">—</span>`;


        const statusClass =
            program.status === "ACTIVE"
                ? "admin-status-active"
                : "admin-status-inactive";


        const statusLabel =
            program.status === "ACTIVE"
                ? "Active"
                : "Inactive";


        const fee =
            Number(program.fee || 0);


        return `
            <tr>

                <td>

                    <p class="program-name">
                        ${escapeHtml(program.name)}
                    </p>

                    <p class="program-description">
                        ${escapeHtml(program.description || "No description")}
                    </p>

                    <div class="program-tech-list">
                        ${technologyHtml}
                    </div>

                </td>


                <td>
                    <span class="program-meta">
                        ${escapeHtml(program.category || "—")}
                    </span>
                </td>


                <td>
                    <span class="program-meta">
                        ${formatLevel(program.level)}
                    </span>
                </td>


                <td>
                    <span class="program-meta">
                        ${formatProgramType(program.program_type)}
                    </span>
                </td>


                <td>
                    <span class="program-meta">
                        ${escapeHtml(program.duration || "—")}
                    </span>
                </td>


                <td>
                    <strong>
                        ₹${fee.toLocaleString("en-IN")}
                    </strong>
                </td>


                <td>

                    <span class="admin-status ${statusClass}">
                        ${statusLabel}
                    </span>

                </td>


                <td>

                    <div class="admin-actions">

                        <button
                            type="button"
                            class="admin-btn admin-btn-secondary admin-btn-small"
                            data-action="edit"
                            data-id="${program.id}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="admin-btn ${
                                program.status === "ACTIVE"
                                    ? "admin-btn-danger"
                                    : "admin-btn-primary"
                            } admin-btn-small"
                            data-action="toggle"
                            data-id="${program.id}"
                        >
                            ${
                                program.status === "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"
                            }
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    /* =====================================================
       ROW EVENTS
       ===================================================== */

    function attachProgramRowEvents() {

        const actionButtons =
            programsTableBody.querySelectorAll(
                "[data-action]"
            );


        actionButtons.forEach((button) => {

            button.addEventListener(
                "click",
                async () => {

                    const action =
                        button.dataset.action;

                    const id =
                        button.dataset.id;


                    if (action === "edit") {

                        const program =
                            programs.find(
                                (item) =>
                                    item.id === id
                            );

                        if (program) {
                            openProgramModal(program);
                        }

                        return;
                    }


                    if (action === "toggle") {

                        await toggleProgram(id);
                    }

                }
            );

        });
    }


    /* =====================================================
       OPEN MODAL
       ===================================================== */

    function openProgramModal(program = null) {

        clearModalMessage();


        if (program) {

            editingProgramId =
                program.id;

            programModalTitle.textContent =
                "Edit Program";

            saveProgramButton.textContent =
                "Update Program";


            programName.value =
                program.name || "";

            programCategory.value =
                program.category || "";

            programLevel.value =
                program.level ||
                "BEGINNER";

            programType.value =
                program.program_type ||
                "TRAINING";

            programDuration.value =
                program.duration || "";

            programFee.value =
                Number(program.fee || 0);

            programTechnologies.value =
                Array.isArray(program.technologies)
                    ? program.technologies.join(", ")
                    : "";

            programDescription.value =
                program.description || "";

            programActive.checked =
                program.status === "ACTIVE";

        } else {

            editingProgramId =
                null;

            programModalTitle.textContent =
                "Add Program";

            saveProgramButton.textContent =
                "Save Program";

            programForm.reset();

            programLevel.value =
                "BEGINNER";

            programType.value =
                "TRAINING";

            programFee.value =
                "0";

            programActive.checked =
                true;
        }


        programModal.classList.add("open");

        programModal.setAttribute(
            "aria-hidden",
            "false"
        );


        setTimeout(() => {
            programName.focus();
        }, 50);
    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closeProgramModalHandler() {

        programModal.classList.remove("open");

        programModal.setAttribute(
            "aria-hidden",
            "true"
        );

        clearModalMessage();

        editingProgramId =
            null;
    }


    /* =====================================================
       SAVE PROGRAM
       ===================================================== */

    async function saveProgram(event) {

        event.preventDefault();

        clearModalMessage();


        const name =
            programName.value.trim();

        const category =
            programCategory.value.trim();

        const level =
            programLevel.value;

        const type =
            programType.value;

        const duration =
            programDuration.value.trim();

        const fee =
            Number(programFee.value || 0);

        const technologies =
            programTechnologies.value
                .split(",")
                .map(
                    (item) =>
                        item.trim()
                )
                .filter(Boolean);

        const description =
            programDescription.value.trim();

        const status =
            programActive.checked
                ? "ACTIVE"
                : "INACTIVE";


        if (!name) {

            showModalMessage(
                "Program name is required.",
                "error"
            );

            programName.focus();

            return;
        }


        if (!category) {

            showModalMessage(
                "Program category is required.",
                "error"
            );

            programCategory.focus();

            return;
        }


        if (Number.isNaN(fee) || fee < 0) {

            showModalMessage(
                "Please enter a valid fee.",
                "error"
            );

            programFee.focus();

            return;
        }


        saveProgramButton.disabled =
            true;

        saveProgramButton.textContent =
            editingProgramId
                ? "Updating..."
                : "Saving...";


        try {

            const baseData = {
                name,
                category,
                description:
                    description || null,
                level,
                program_type: type,
                duration:
                    duration || null,
                fee,
                technologies,
                status
            };


            if (editingProgramId) {

                const {
                    error
                } = await supabaseClient
                    .from("programs")
                    .update(baseData)
                    .eq(
                        "id",
                        editingProgramId
                    );


                if (error) {
                    throw error;
                }


                showToast(
                    "Program updated successfully.",
                    "success"
                );

            } else {

                const slug =
                    await createUniqueSlug(name);


                const {
                    error
                } = await supabaseClient
                    .from("programs")
                    .insert({
                        ...baseData,
                        slug
                    });


                if (error) {
                    throw error;
                }


                showToast(
                    "Program added successfully.",
                    "success"
                );
            }


            closeProgramModalHandler();

            await loadPrograms();

        } catch (error) {

            console.error(
                "NITRIXA Program Save Error:",
                error
            );


            let message =
                "Program could not be saved. Please try again.";


            if (
                error?.code === "23505"
            ) {
                message =
                    "A program with this name or slug already exists.";
            }


            showModalMessage(
                message,
                "error"
            );

        } finally {

            saveProgramButton.disabled =
                false;

            saveProgramButton.textContent =
                editingProgramId
                    ? "Update Program"
                    : "Save Program";
        }
    }


    /* =====================================================
       TOGGLE PROGRAM
       ===================================================== */

    async function toggleProgram(id) {

        const program =
            programs.find(
                (item) =>
                    item.id === id
            );


        if (!program) {
            return;
        }


        const newStatus =
            program.status === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";


        try {

            const {
                error
            } = await supabaseClient
                .from("programs")
                .update({
                    status: newStatus
                })
                .eq(
                    "id",
                    id
                );


            if (error) {
                throw error;
            }


            showToast(
                newStatus === "ACTIVE"
                    ? "Program activated."
                    : "Program deactivated.",
                "success"
            );


            await loadPrograms();

        } catch (error) {

            console.error(
                "NITRIXA Program Status Error:",
                error
            );


            showToast(
                "Program status could not be updated.",
                "error"
            );
        }
    }


    /* =====================================================
       UNIQUE SLUG
       ===================================================== */

    async function createUniqueSlug(name) {

        const baseSlug =
            slugify(name);


        let slug =
            baseSlug;

        let counter =
            1;


        while (true) {

            const {
                data,
                error
            } = await supabaseClient
                .from("programs")
                .select("id")
                .eq(
                    "slug",
                    slug
                )
                .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {
                return slug;
            }


            counter++;

            slug =
                `${baseSlug}-${counter}`;
        }
    }


    /* =====================================================
       UPDATE STATS
       ===================================================== */

    function updateStats() {

        const total =
            programs.length;


        const active =
            programs.filter(
                (program) =>
                    program.status === "ACTIVE"
            ).length;


        const inactive =
            programs.filter(
                (program) =>
                    program.status === "INACTIVE"
            ).length;


        totalPrograms.textContent =
            total;

        activePrograms.textContent =
            active;

        inactivePrograms.textContent =
            inactive;
    }


    /* =====================================================
       LOADING STATE
       ===================================================== */

    function showLoadingState() {

        programsTableBody.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="admin-state">

                        <div class="admin-spinner"></div>

                        <p class="admin-state-title">
                            Loading programs...
                        </p>

                        <p class="admin-state-text">
                            Please wait while the program data is loaded.
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

        clearTimeout(toastTimer);


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

    function formatLevel(level) {

        const map = {
            BEGINNER:
                "Beginner",

            BEGINNER_TO_INTERMEDIATE:
                "Beginner → Intermediate",

            INTERMEDIATE:
                "Intermediate"
        };


        return map[level] || level || "—";
    }


    function formatProgramType(type) {

        const map = {
            TRAINING:
                "Training",

            INTERNSHIP:
                "Internship",

            TRAINING_AND_INTERNSHIP:
                "Training + Internship"
        };


        return map[type] || type || "—";
    }


    function slugify(value) {

        return value
            .toLowerCase()
            .trim()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );
    }


    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
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