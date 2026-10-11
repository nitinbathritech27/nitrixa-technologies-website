
/* =========================================================
   NITRIXA TECHNOLOGIES
   ADMIN PROGRAM MANAGEMENT
   VERSION 4 - MULTIPLE DURATIONS & FEES
   ========================================================= */

(function () {
    "use strict";

    console.log("NITRIXA ADMIN PROGRAMS: Version 4 loaded.");

    let programs = [];
    let editingProgramId = null;
    let durationRows = [];
    let isSaving = false;

    const supabase = () => window.supabaseClient;

    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener("DOMContentLoaded", function () {
        setupEvents();
        initializePage();
    });

    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initializePage() {
        if (!supabase()) {
            hideLoading();
            showStatus(
                "Supabase client is not available. Check supabase.js.",
                "error"
            );
            return;
        }

        const isAdmin = await checkAdminAccess();

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
        const addButton = document.getElementById(
            "openProgramModalButton"
        );

        if (addButton) {
            addButton.addEventListener("click", openAddModal);
        }

        const closeButton = document.getElementById(
            "closeProgramModalButton"
        );

        if (closeButton) {
            closeButton.addEventListener("click", closeModal);
        }

        const cancelButton = document.getElementById(
            "cancelProgramButton"
        );

        if (cancelButton) {
            cancelButton.addEventListener("click", closeModal);
        }

        const refreshButton = document.getElementById(
            "refreshProgramsButton"
        );

        if (refreshButton) {
            refreshButton.addEventListener("click", loadPrograms);
        }

        const form = document.getElementById("programForm");

        if (form) {
            form.addEventListener("submit", saveProgram);
        }

        const type = document.getElementById("programType");

        if (type) {
            type.addEventListener("change", updateTypeFields);
        }

        const logout = document.getElementById("adminLogoutButton");

        if (logout) {
            logout.addEventListener("click", logoutAdmin);
        }

        const addDurationButton = document.getElementById(
            "addProgramDurationButton"
        );

        if (addDurationButton) {
            addDurationButton.addEventListener("click", function () {
                addDurationRow();
            });
        }

        document.addEventListener("click", function (event) {
            const actionButton = event.target.closest("[data-action]");

            if (actionButton) {
                const action = actionButton.dataset.action;
                const id = actionButton.dataset.id;

                if (action === "edit") {
                    editProgram(id);
                } else if (action === "toggle") {
                    toggleProgram(id);
                }

                return;
            }

            const removeDurationButton = event.target.closest(
                "[data-remove-duration]"
            );

            if (removeDurationButton) {
                const row = removeDurationButton.closest(
                    ".np-duration-row"
                );

                if (row) {
                    row.remove();
                    updateDefaultFeeFromDurations();
                }
            }
        });

        document.addEventListener("input", function (event) {
            if (
                event.target.matches("[data-duration-label]") ||
                event.target.matches("[data-duration-fee]") ||
                event.target.matches("[data-duration-description]")
            ) {
                updateDefaultFeeFromDurations();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                const modal = document.getElementById("programModal");

                if (modal && !modal.hidden) {
                    closeModal();
                }
            }
        });

        console.log("NITRIXA ADMIN PROGRAMS: Events ready.");
    }

    /* =====================================================
       ADMIN ACCESS
    ===================================================== */

    async function checkAdminAccess() {
        try {
            const sessionResponse = await supabase().auth.getSession();

            if (sessionResponse.error) {
                throw sessionResponse.error;
            }

            const session =
                sessionResponse.data &&
                sessionResponse.data.session;

            if (!session) {
                window.location.href = "login.html";
                return false;
            }

            const adminResponse = await supabase().rpc("is_admin");

            if (adminResponse.error) {
                throw adminResponse.error;
            }

            if (adminResponse.data !== true) {
                showStatus(
                    "You do not have admin permission.",
                    "error"
                );

                setTimeout(function () {
                    window.location.href = "login.html";
                }, 1500);

                return false;
            }

            return true;
        } catch (error) {
            console.error("Admin access error:", error);

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
        showLoading();

        try {
            const response = await supabase()
                .from("programs")
                .select([
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
                ].join(","))
                .order("created_at", { ascending: false });

            if (response.error) {
                throw response.error;
            }

            programs = Array.isArray(response.data)
                ? response.data
                : [];

            /*
             * Load duration records separately so a duration-table
             * issue does not prevent the program list from loading.
             */
            await loadDurationsForPrograms();

            renderPrograms();
        } catch (error) {
            console.error("Load programs error:", error);
            hideLoading();

            showStatus(
                "Programs could not be loaded: " +
                (error.message || "Unknown error"),
                "error"
            );
        }
    }

    async function loadDurationsForPrograms() {
        if (!programs.length) {
            durationRows = [];
            return;
        }

        const programIds = programs.map(function (program) {
            return program.id;
        });

        const response = await supabase()
            .from("program_durations")
            .select([
                "id",
                "program_id",
                "duration_label",
                "fee",
                "description",
                "status",
                "sort_order",
                "created_at",
                "updated_at"
            ].join(","))
            .in("program_id", programIds)
            .order("sort_order", { ascending: true });

        if (response.error) {
            console.warn(
                "Duration records could not be loaded:",
                response.error.message
            );

            durationRows = [];
            return;
        }

        durationRows = Array.isArray(response.data)
            ? response.data
            : [];
    }

    function getDurationsForProgram(programId) {
        return durationRows
            .filter(function (item) {
                return String(item.program_id) === String(programId);
            })
            .sort(function (a, b) {
                return Number(a.sort_order || 0) -
                    Number(b.sort_order || 0);
            });
    }

    /* =====================================================
       RENDER PROGRAMS
    ===================================================== */

    function renderPrograms() {
        hideLoading();
        updateSummary();

        const tbody = document.getElementById("programsTableBody");
        const table = document.getElementById("programsTableWrapper");
        const empty = document.getElementById("programsEmptyState");

        if (!tbody) {
            console.error("programsTableBody not found.");
            return;
        }

        tbody.innerHTML = "";

        if (!programs.length) {
            if (table) table.hidden = true;
            if (empty) empty.hidden = false;
            return;
        }

        if (empty) empty.hidden = true;
        if (table) table.hidden = false;

        programs.forEach(function (program) {
            tbody.insertAdjacentHTML(
                "beforeend",
                createProgramRow(program)
            );
        });
    }

    function createProgramRow(program) {
        const type = formatProgramType(program.program_type);
        const durations = getDurationsForProgram(program.id);
        const duration = getProgramDuration(program, durations);
        const fee = getProgramFee(program, durations);
        const payment = getPaymentLabel(program);

        const statusClass = program.status === "ACTIVE"
            ? "active"
            : "inactive";

        const toggleText = program.status === "ACTIVE"
            ? "Deactivate"
            : "Activate";

        return `
            <tr>
                <td>
                    <div class="np-program-name">
                        <strong>${escapeHtml(
                            program.name || "Unnamed Program"
                        )}</strong>
                        <small>${escapeHtml(
                            program.category || "—"
                        )}</small>
                    </div>
                </td>

                <td>
                    <span class="np-badge">
                        ${escapeHtml(type)}
                    </span>
                </td>

                <td>${duration}</td>

                <td>${fee}</td>

                <td>${escapeHtml(payment)}</td>

                <td>
                    <span class="np-status-badge ${statusClass}">
                        ${escapeHtml(program.status || "UNKNOWN")}
                    </span>
                </td>

                <td>
                    <div class="np-actions">
                        <button
                            type="button"
                            class="np-action"
                            data-action="edit"
                            data-id="${escapeHtml(program.id)}"
                        >Edit</button>

                        <button
                            type="button"
                            class="np-action"
                            data-action="toggle"
                            data-id="${escapeHtml(program.id)}"
                        >${toggleText}</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function updateSummary() {
        const active = programs.filter(function (program) {
            return program.status === "ACTIVE";
        }).length;

        const inactive = programs.filter(function (program) {
            return program.status === "INACTIVE";
        }).length;

        const internship = programs.filter(function (program) {
            return program.program_type === "INTERNSHIP";
        }).length;

        setText("totalProgramsCount", programs.length);
        setText("activeProgramsCount", active);
        setText("inactiveProgramsCount", inactive);
        setText("internshipProgramsCount", internship);
    }

    /* =====================================================
       DURATION ROW MANAGEMENT
    ===================================================== */

    function addDurationRow(duration) {
        const container = document.getElementById(
            "programDurationsContainer"
        );

        if (!container) {
            showStatus(
                "Duration fields are missing in programs.html. Update that file first.",
                "error"
            );
            return;
        }

        const item = duration || {};

        const row = document.createElement("div");
        row.className = "np-duration-row";
        row.dataset.durationId = item.id || "";

        row.style.cssText = [
            "border:1px solid #e2e8f0",
            "border-radius:12px",
            "padding:16px",
            "margin-bottom:12px",
            "background:#fbfdff"
        ].join(";");

        row.innerHTML = `
            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
                gap:12px;
            ">
                <div class="np-form-group" style="margin-bottom:0;">
                    <label>Duration Label *</label>
                    <input
                        type="text"
                        data-duration-label
                        maxlength="100"
                        required
                        placeholder="3 Months"
                        value="${escapeHtml(item.duration_label || "")}"
                    >
                </div>

                <div class="np-form-group" style="margin-bottom:0;">
                    <label>Fee (₹) *</label>
                    <input
                        type="number"
                        data-duration-fee
                        min="0"
                        step="1"
                        required
                        placeholder="499"
                        value="${item.fee === undefined || item.fee === null
                            ? ""
                            : escapeHtml(item.fee)}"
                    >
                </div>
            </div>

            <div class="np-form-group" style="margin-top:12px;margin-bottom:0;">
                <label>What's Included (Optional)</label>
                <textarea
                    data-duration-description
                    rows="2"
                    maxlength="1000"
                    placeholder="Live Projects, Mentoring, Dashboard Access, Verified Certificate"
                >${escapeHtml(item.description || "")}</textarea>
            </div>

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-top:12px;
                flex-wrap:wrap;
            ">
                <small style="color:#64748b;">
                    Each duration has its own fee.
                </small>

                <button
                    type="button"
                    class="np-action"
                    data-remove-duration
                >Remove Duration</button>
            </div>
        `;

        container.appendChild(row);
        updateDefaultFeeFromDurations();
    }

    function renderDurationRows(items) {
        const container = document.getElementById(
            "programDurationsContainer"
        );

        if (!container) return;

        container.innerHTML = "";

        if (Array.isArray(items) && items.length) {
            items.forEach(function (item) {
                addDurationRow(item);
            });
        } else {
            addDurationRow();
        }

        updateDefaultFeeFromDurations();
    }

    function collectDurationRows() {
        const container = document.getElementById(
            "programDurationsContainer"
        );

        if (!container) {
            /*
             * Compatibility fallback for the previous HTML form.
             * Once the updated HTML is installed, this branch
             * will no longer be used.
             */
            const oldDuration = getValue("programDuration");
            const oldFee = getValue("programFee");

            if (!oldDuration && oldFee === "") {
                return [];
            }

            return [{
                id: "",
                duration_label: oldDuration,
                fee: Number(oldFee || 0),
                description: "",
                status: "ACTIVE",
                sort_order: 0
            }];
        }

        const rows = Array.from(
            container.querySelectorAll(".np-duration-row")
        );

        return rows.map(function (row, index) {
            const label = row.querySelector("[data-duration-label]");
            const fee = row.querySelector("[data-duration-fee]");
            const description = row.querySelector(
                "[data-duration-description]"
            );

            return {
                id: row.dataset.durationId || "",
                duration_label: label ? label.value.trim() : "",
                fee: fee && fee.value !== ""
                    ? Number(fee.value)
                    : NaN,
                description: description
                    ? description.value.trim()
                    : "",
                status: "ACTIVE",
                sort_order: index
            };
        });
    }

    function updateDefaultFeeFromDurations() {
        const container = document.getElementById(
            "programDurationsContainer"
        );

        if (!container) return;

        const firstRow = container.querySelector(".np-duration-row");
        if (!firstRow) {
            setValue("programFee", "");
            return;
        }

        const feeInput = firstRow.querySelector("[data-duration-fee]");

        setValue(
            "programFee",
            feeInput && feeInput.value !== ""
                ? feeInput.value
                : ""
        );
    }

    /* =====================================================
       ADD PROGRAM MODAL
    ===================================================== */

    function openAddModal() {
        editingProgramId = null;

        const form = document.getElementById("programForm");
        if (form) form.reset();

        setValue("programId", "");
        setValue("programStatus", "ACTIVE");

        const title = document.getElementById("programModalTitle");
        if (title) title.textContent = "Add Program";

        const save = document.getElementById("saveProgramButton");
        if (save) save.textContent = "Save Program";

        renderDurationRows([]);
        updateTypeFields();
        openModal();
    }

    /* =====================================================
       EDIT PROGRAM
    ===================================================== */

    async function editProgram(id) {
        const program = programs.find(function (item) {
            return String(item.id) === String(id);
        });

        if (!program) {
            showStatus("Program not found.", "error");
            return;
        }

        editingProgramId = program.id;

        setValue("programId", program.id);
        setValue("programName", program.name);
        setValue("programSlug", program.slug);
        setValue("programCategory", program.category);
        setValue("programDescription", program.description);
        setValue("programLevel", program.level);
        setValue("programType", program.program_type);
        setValue("programDuration", program.duration);
        setValue("trainingDuration", program.training_duration);
        setValue("internshipDuration", program.internship_duration);
        setValue("programFee", program.fee);
        setValue("paymentModel", program.payment_model);

        setValue(
            "programTechnologies",
            normalizeTechnologies(program.technologies).join(", ")
        );

        setValue("programStatus", program.status || "ACTIVE");

        const title = document.getElementById("programModalTitle");
        if (title) title.textContent = "Edit Program";

        const save = document.getElementById("saveProgramButton");
        if (save) save.textContent = "Update Program";

        try {
            const durations = await fetchProgramDurations(program.id);

            if (durations.length) {
                renderDurationRows(durations);
            } else {
                /*
                 * Existing programs may not yet have duration rows.
                 * Create one editable option from the old program data.
                 */
                renderDurationRows([{
                    duration_label:
                        program.duration ||
                        program.internship_duration ||
                        (
                            program.program_type ===
                            "TRAINING_AND_INTERNSHIP"
                                ? (
                                    (program.training_duration || "") +
                                    " + " +
                                    (program.internship_duration || "")
                                ).trim()
                                : ""
                        ),
                    fee: program.fee,
                    description: "",
                    status: "ACTIVE",
                    sort_order: 0
                }]);
            }
        } catch (error) {
            console.error("Load program durations error:", error);

            renderDurationRows([{
                duration_label:
                    program.duration ||
                    program.internship_duration ||
                    "",
                fee: program.fee,
                description: "",
                status: "ACTIVE",
                sort_order: 0
            }]);

            showStatus(
                "Program loaded, but duration options could not be loaded: " +
                error.message,
                "error"
            );
        }

        updateTypeFields();
        openModal();
    }

    async function fetchProgramDurations(programId) {
        const response = await supabase()
            .from("program_durations")
            .select([
                "id",
                "program_id",
                "duration_label",
                "fee",
                "description",
                "status",
                "sort_order"
            ].join(","))
            .eq("program_id", programId)
            .order("sort_order", { ascending: true });

        if (response.error) throw response.error;

        return Array.isArray(response.data) ? response.data : [];
    }

    /* =====================================================
       PROGRAM TYPE & PAYMENT RULES
    ===================================================== */

    function updateTypeFields() {
        const type = getValue("programType");

        const trainingGroup = document.getElementById(
            "trainingDurationGroup"
        );

        const trainingInput = document.getElementById(
            "trainingDuration"
        );

        const internshipInput = document.getElementById(
            "internshipDuration"
        );

        const payment = document.getElementById("paymentModel");
        const note = document.getElementById(
            "paymentConfigurationNote"
        );

        if (!trainingGroup) return;

        if (type === "TRAINING_AND_INTERNSHIP") {
            trainingGroup.style.display = "";

            if (trainingInput) trainingInput.required = true;
            if (internshipInput) internshipInput.required = true;

            if (payment) {
                payment.value = "FULL_ONLY";
                payment.disabled = true;
            }

            if (note) {
                note.textContent =
                    "Training + Internship uses full payment during enrollment. " +
                    "Internship unlocks after training completion and approval.";
            }
        } else if (type === "INTERNSHIP") {
            trainingGroup.style.display = "none";

            if (trainingInput) trainingInput.required = false;
            if (internshipInput) internshipInput.required = false;

            if (payment) {
                payment.disabled = false;
                payment.required = true;

                if (!payment.value) {
                    payment.value = "FULL_AND_INSTALLMENT";
                }
            }

            if (note) {
                note.textContent =
                    "Internship can use full payment or the 3-month installment option.";
            }
        } else {
            trainingGroup.style.display = "";

            if (trainingInput) trainingInput.required = false;
            if (internshipInput) internshipInput.required = false;

            if (payment) {
                payment.disabled = false;
                payment.required = true;
            }

            if (note) {
                note.textContent =
                    "Select a program type to configure payment.";
            }
        }
    }

    /* =====================================================
       SAVE PROGRAM
    ===================================================== */

    async function saveProgram(event) {
        event.preventDefault();

        if (isSaving) return;

        const button = document.getElementById("saveProgramButton");
        const wasEditing = Boolean(editingProgramId);

        isSaving = true;

        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        try {
            const payload = collectForm();
            const durations = collectDurationRows();

            validateProgram(payload, durations);

            let programId = editingProgramId;

            if (programId) {
                const response = await supabase()
                    .from("programs")
                    .update(payload)
                    .eq("id", programId)
                    .select("id")
                    .single();

                if (response.error) throw response.error;

                programId = response.data.id;
            } else {
                const response = await supabase()
                    .from("programs")
                    .insert([payload])
                    .select("id")
                    .single();

                if (response.error) throw response.error;

                programId = response.data.id;
            }

            /*
             * Save durations after the parent program exists.
             * If this fails, the program is retained and the error
             * is shown rather than pretending the entire save succeeded.
             */
            await syncProgramDurations(programId, durations);

            closeModal();

            showStatus(
                wasEditing
                    ? "Program and duration options updated successfully."
                    : "Program and duration options created successfully.",
                "success"
            );

            editingProgramId = null;

            await loadPrograms();
        } catch (error) {
            console.error("Save program error:", error);

            showStatus(
                error.message || "Program could not be saved.",
                "error"
            );
        } finally {
            isSaving = false;

            if (button) {
                button.disabled = false;
                button.textContent = editingProgramId
                    ? "Update Program"
                    : "Save Program";
            }
        }
    }

    /* =====================================================
       SYNCHRONIZE PROGRAM DURATIONS
    ===================================================== */

    async function syncProgramDurations(programId, durations) {
        const existing = await fetchProgramDurations(programId);

        const existingByLabel = new Map();

        existing.forEach(function (item) {
            existingByLabel.set(
                item.duration_label.trim().toLowerCase(),
                item
            );
        });

        const prepared = durations.map(function (item, index) {
            const existingItem = existingByLabel.get(
                item.duration_label.trim().toLowerCase()
            );

            const row = {
                program_id: programId,
                duration_label: item.duration_label,
                fee: item.fee,
                description: item.description || null,
                status: "ACTIVE",
                sort_order: index,
                updated_at: new Date().toISOString()
            };

            if (existingItem) {
                row.id = existingItem.id;
            }

            return row;
        });

        if (prepared.length) {
            const upsertResponse = await supabase()
                .from("program_durations")
                .upsert(prepared, {
                    onConflict: "program_id,duration_label"
                });

            if (upsertResponse.error) {
                throw new Error(
                    "Program saved, but durations could not be saved: " +
                    upsertResponse.error.message
                );
            }
        }

        /*
         * Remove duration options deleted in the admin form.
         * Fetching the remaining IDs avoids unsafe string-built
         * NOT IN expressions for UUIDs or duration labels.
         */
        const current = await fetchProgramDurations(programId);

        const keepLabels = new Set(
            durations.map(function (item) {
                return item.duration_label.trim().toLowerCase();
            })
        );

        const removedIds = current
            .filter(function (item) {
                return !keepLabels.has(
                    item.duration_label.trim().toLowerCase()
                );
            })
            .map(function (item) {
                return item.id;
            });

        if (removedIds.length) {
            const deleteResponse = await supabase()
                .from("program_durations")
                .delete()
                .eq("program_id", programId)
                .in("id", removedIds);

            if (deleteResponse.error) {
                throw new Error(
                    "Program and durations were saved, but removed options " +
                    "could not be deleted: " +
                    deleteResponse.error.message
                );
            }
        }
    }

    /* =====================================================
       COLLECT FORM
    ===================================================== */

    function collectForm() {
        const type = getValue("programType");
        const technologyText = getValue("programTechnologies");

        const technologies = technologyText
            ? technologyText.split(",").map(function (item) {
                return item.trim();
            }).filter(Boolean)
            : [];

        const durations = collectDurationRows();
        const firstDuration = durations.length ? durations[0] : null;

        let paymentModel = getValue("paymentModel");

        if (type === "TRAINING_AND_INTERNSHIP") {
            paymentModel = "FULL_ONLY";
        }

        const trainingDuration = getValue("trainingDuration");
        const internshipDuration = getValue("internshipDuration");

        const legacyDuration = firstDuration
            ? firstDuration.duration_label
            : getValue("programDuration");

        const legacyFee = firstDuration
            ? firstDuration.fee
            : Number(getValue("programFee") || 0);

        return {
            name: getValue("programName"),

            slug: getValue("programSlug")
                .toLowerCase()
                .replace(/\s+/g, "-"),

            category: getValue("programCategory"),
            description: getValue("programDescription"),
            level: getValue("programLevel"),
            program_type: type,

            /*
             * Keep legacy columns synchronized for existing
             * pages that still read programs.duration and programs.fee.
             */
            duration: legacyDuration || null,
            fee: Number(legacyFee || 0),

            technologies: technologies,

            status: getValue("programStatus") || "ACTIVE",

            training_duration:
                type === "TRAINING_AND_INTERNSHIP"
                    ? trainingDuration
                    : null,

            internship_duration:
                internshipDuration || null,

            payment_model: paymentModel || "FULL_ONLY",

            updated_at: new Date().toISOString()
        };
    }

    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateProgram(data, durations) {
        if (!data.name) {
            throw new Error("Program name is required.");
        }

        if (!data.slug) {
            throw new Error("Program slug is required.");
        }

        if (!data.category) {
            throw new Error("Category is required.");
        }

        if (!data.description) {
            throw new Error("Program description is required.");
        }

        if (!data.level) {
            throw new Error("Level is required.");
        }

        if (
            data.program_type !== "INTERNSHIP" &&
            data.program_type !== "TRAINING_AND_INTERNSHIP"
        ) {
            throw new Error("Please select a valid program type.");
        }

        if (!Array.isArray(durations) || !durations.length) {
            throw new Error("Add at least one duration option.");
        }

        const labels = new Set();

        durations.forEach(function (item, index) {
            if (!item.duration_label) {
                throw new Error(
                    "Enter the duration label for option " +
                    (index + 1) + "."
                );
            }

            const normalizedLabel = item.duration_label.toLowerCase();

            if (labels.has(normalizedLabel)) {
                throw new Error(
                    "Each duration label must be unique within a program."
                );
            }

            labels.add(normalizedLabel);

            if (
                !Number.isFinite(item.fee) ||
                item.fee < 0
            ) {
                throw new Error(
                    "Enter a valid non-negative fee for " +
                    item.duration_label + "."
                );
            }
        });

        if (
            data.program_type === "TRAINING_AND_INTERNSHIP" &&
            !data.training_duration
        ) {
            throw new Error("Training duration is required.");
        }

        /*
         * Duration labels now hold the selectable options.
         * internship_duration remains optional so a program can
         * use labels such as "3 + 3 Months" or "6 + 3 Months".
         */
    }

    /* =====================================================
       TOGGLE PROGRAM STATUS
    ===================================================== */

    async function toggleProgram(id) {
        const program = programs.find(function (item) {
            return String(item.id) === String(id);
        });

        if (!program) return;

        const newStatus = program.status === "ACTIVE"
            ? "INACTIVE"
            : "ACTIVE";

        const confirmText = newStatus === "ACTIVE"
            ? "Activate this program?"
            : "Deactivate this program?";

        if (!window.confirm(confirmText)) return;

        try {
            const response = await supabase()
                .from("programs")
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("id", program.id);

            if (response.error) throw response.error;

            /*
             * Keep duration status aligned with the program status.
             * This prevents active options being offered for a
             * program that the admin has deactivated.
             */
            const durationResponse = await supabase()
                .from("program_durations")
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("program_id", program.id);

            if (durationResponse.error) {
                console.warn(
                    "Program status changed, but duration status update failed:",
                    durationResponse.error
                );
            }

            showStatus(
                "Program " + newStatus.toLowerCase() + " successfully.",
                "success"
            );

            await loadPrograms();
        } catch (error) {
            console.error("Toggle program status error:", error);

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
        const modal = document.getElementById("programModal");

        if (!modal) {
            console.error("programModal not found.");
            return;
        }

        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        const modal = document.getElementById("programModal");

        if (modal) {
            modal.hidden = true;
        }

        document.body.style.overflow = "";
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logoutAdmin() {
        try {
            const response = await supabase().auth.signOut();

            if (response.error) {
                console.error("Logout error:", response.error);
            }
        } finally {
            window.location.href = "login.html";
        }
    }

    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {
        const loading = document.getElementById("programsLoadingState");
        const table = document.getElementById("programsTableWrapper");
        const empty = document.getElementById("programsEmptyState");

        if (loading) loading.hidden = false;
        if (table) table.hidden = true;
        if (empty) empty.hidden = true;
    }

    function hideLoading() {
        const loading = document.getElementById("programsLoadingState");

        if (loading) {
            loading.hidden = true;
        }
    }

    /* =====================================================
       DISPLAY HELPERS
    ===================================================== */

    function getProgramDuration(program, durations) {
        if (durations && durations.length) {
            return durations.map(function (item) {
                return escapeHtml(item.duration_label);
            }).join("<br>");
        }

        if (program.program_type === "TRAINING_AND_INTERNSHIP") {
            return (
                escapeHtml(program.training_duration || "—") +
                " + " +
                escapeHtml(program.internship_duration || "—")
            );
        }

        return escapeHtml(
            program.internship_duration ||
            program.duration ||
            "—"
        );
    }

    function getProgramFee(program, durations) {
        if (durations && durations.length) {
            return durations.map(function (item) {
                return "₹" + Number(item.fee || 0).toLocaleString("en-IN");
            }).join("<br>");
        }

        return "₹" + Number(program.fee || 0).toLocaleString("en-IN");
    }

    function getPaymentLabel(program) {
        if (program.program_type === "TRAINING_AND_INTERNSHIP") {
            return "Full Only";
        }

        if (program.payment_model === "FULL_AND_INSTALLMENT") {
            return "Full + Installment";
        }

        return "Full Only";
    }

    function formatProgramType(type) {
        if (type === "INTERNSHIP") return "Internship";

        if (type === "TRAINING_AND_INTERNSHIP") {
            return "Training + Internship";
        }

        return type || "Program";
    }

    function normalizeTechnologies(technologies) {
        if (Array.isArray(technologies)) {
            return technologies.map(function (item) {
                return String(item).trim();
            }).filter(Boolean);
        }

        if (typeof technologies === "string") {
            return technologies.split(",").map(function (item) {
                return item.trim();
            }).filter(Boolean);
        }

        return [];
    }

    function getValue(id) {
        const element = document.getElementById(id);

        if (!element) return "";

        return String(element.value || "").trim();
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value =
                value === null || typeof value === "undefined"
                    ? ""
                    : value;
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(value) {
        return String(
            value === null || typeof value === "undefined"
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =====================================================
       STATUS MESSAGE
    ===================================================== */

    function showStatus(message, type) {
        const element = document.getElementById(
            "programStatusMessage"
        );

        if (!element) return;

        element.textContent = message;

        element.className = "np-status " +
            (type === "success" ? "success" : "error");

        element.hidden = false;

        clearTimeout(showStatus.timer);

        showStatus.timer = setTimeout(function () {
            element.hidden = true;
        }, 7000);
    }
})();
