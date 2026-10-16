
/* =========================================================
   NITRIXA TECHNOLOGIES
   TASKS & ASSIGNMENTS
   Module 2 - Phase 2.2: Create and save draft tasks
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const supabase = window.supabaseClient;

    const form = document.getElementById("createTaskForm");
    const saveButton = document.getElementById("saveDraftButton");
    const resetButton = document.getElementById("resetTaskFormButton");
    const refreshButton = document.getElementById("refreshTasksButton");
    const logoutButton = document.getElementById("logoutButton");

    const messageBox = document.getElementById("taskPageMessage");
    const connectionStatus = document.getElementById("taskConnectionStatus");
    const tableBody = document.getElementById("tasksTableBody");
    const emptyState = document.getElementById("tasksEmptyState");

    const totalTasks = document.getElementById("totalTasks");
    const publishedTasks = document.getElementById("publishedTasks");
    const draftTasks = document.getElementById("draftTasks");

    let currentUser = null;
    let isAdmin = false;
    let isSaving = false;

    function showMessage(message, type = "success") {
        messageBox.textContent = message;
        messageBox.className = `message show ${type}`;
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.className = "message";
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function assignmentLabel(value) {
        const labels = {
            BATCH: "Batch-wise",
            INDIVIDUAL: "Individual",
            ALL: "All eligible interns"
        };

        return labels[value] || value || "—";
    }

    function renderTasks(tasks) {
        tableBody.replaceChildren();

        if (!tasks.length) {
            emptyState.hidden = false;
            emptyState.textContent = "No tasks created yet. Create your first task above.";
            return;
        }

        emptyState.hidden = true;

        tasks.forEach(task => {
            const row = document.createElement("tr");

            const values = [
                task.title,
                assignmentLabel(task.assignment_type),
                formatDate(task.due_date),
                task.status,
                formatDate(task.created_at)
            ];

            values.forEach((value, index) => {
                const cell = document.createElement("td");

                if (index === 3) {
                    const badge = document.createElement("span");
                    badge.className = "status";
                    badge.textContent = value || "DRAFT";
                    cell.appendChild(badge);
                } else {
                    cell.textContent = value || "—";
                }

                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    function updateCounters(tasks) {
        totalTasks.textContent = String(tasks.length);
        publishedTasks.textContent = String(
            tasks.filter(task => task.status === "PUBLISHED").length
        );
        draftTasks.textContent = String(
            tasks.filter(task => task.status === "DRAFT").length
        );
    }

    async function verifyAdmin() {
        if (!supabase) {
            throw new Error(
                "Supabase client not found. Check js/supabase.js and the Supabase CDN."
            );
        }

        const {
            data: { session },
            error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            window.location.replace("login.html");
            return false;
        }

        currentUser = session.user;

        const { data, error } = await supabase.rpc("is_admin");

        if (error) {
            console.error("Admin verification failed:", error);
            throw new Error("Administrator verification failed. Access was not granted.");
        }

        if (data !== true) {
            await supabase.auth.signOut();
            window.location.replace("login.html");
            return false;
        }

        isAdmin = true;
        return true;
    }

    async function loadTasks() {
        if (!isAdmin) return;

        refreshButton.disabled = true;
        connectionStatus.textContent = "Loading…";
        emptyState.hidden = false;
        emptyState.textContent = "Loading tasks…";

        try {
            const { data, error } = await supabase
                .from("projects")
                .select("id, title, assignment_type, due_date, status, created_at")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const tasks = Array.isArray(data) ? data : [];

            updateCounters(tasks);
            renderTasks(tasks);
            connectionStatus.textContent = "Connected";
        } catch (error) {
            console.error("Task list loading failed:", error);

            totalTasks.textContent = "—";
            publishedTasks.textContent = "—";
            draftTasks.textContent = "—";
            connectionStatus.textContent = "Load failed";
            emptyState.hidden = false;
            emptyState.textContent = "Tasks could not be loaded. Check the browser console.";

            showMessage(
                `Unable to load tasks: ${error.message || "Unknown error"}`,
                "error"
            );
        } finally {
            refreshButton.disabled = false;
        }
    }

    async function saveDraft(event) {
        event.preventDefault();

        if (!isAdmin || !currentUser) {
            showMessage("Admin session is not verified. Please sign in again.", "error");
            return;
        }

        if (isSaving) return;

        clearMessage();

        const title = document.getElementById("taskTitle").value.trim();
        const description = document.getElementById("taskDescription").value.trim();
        const instructions = document.getElementById("taskInstructions").value.trim();
        const assignmentType = document.getElementById("assignmentType").value;
        const deadlineValue = document.getElementById("taskDeadline").value;

        if (!title || !description) {
            showMessage("Task title and description are required.", "error");
            return;
        }

        if (!["BATCH", "INDIVIDUAL", "ALL"].includes(assignmentType)) {
            showMessage("Select a valid assignment type.", "error");
            return;
        }

        let dueDate = null;

        if (deadlineValue) {
            const parsedDeadline = new Date(deadlineValue);

            if (Number.isNaN(parsedDeadline.getTime())) {
                showMessage("Please enter a valid deadline.", "error");
                return;
            }

            if (parsedDeadline.getTime() <= Date.now()) {
                showMessage("Deadline must be in the future.", "error");
                return;
            }

            dueDate = parsedDeadline.toISOString();
        }

        const taskRecord = {
            title,
            description,
            instructions: instructions || null,
            created_by: currentUser.id,
            assignment_type: assignmentType,
            batch_id: null,
            due_date: dueDate,
            status: "DRAFT"
        };

        isSaving = true;
        saveButton.disabled = true;
        saveButton.textContent = "Saving draft…";

        try {
            const { error } = await supabase
                .from("projects")
                .insert(taskRecord);

            if (error) throw error;

            form.reset();

            showMessage(
                "Task saved successfully as Draft. No interns have been assigned and nothing has been published.",
                "success"
            );

            await loadTasks();
        } catch (error) {
            console.error("Draft creation failed:", error);

            showMessage(
                `Draft was not saved: ${error.message || "Unknown error"}. Check the Supabase policy and database error details.`,
                "error"
            );
        } finally {
            isSaving = false;
            saveButton.disabled = false;
            saveButton.textContent = "Save as Draft";
        }
    }

    form.addEventListener("submit", saveDraft);

    resetButton.addEventListener("click", () => {
        clearMessage();
    });

    refreshButton.addEventListener("click", loadTasks);

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            window.location.replace("login.html");
        } catch (error) {
            console.error("Logout failed:", error);
            showMessage("Logout failed. Please try again.", "error");
            logoutButton.disabled = false;
        }
    });

    (async function initialize() {
        connectionStatus.textContent = "Verifying admin…";

        try {
            const authorized = await verifyAdmin();

            if (!authorized) return;

            connectionStatus.textContent = "Admin verified";
            await loadTasks();
        } catch (error) {
            console.error("Task page initialization failed:", error);

            connectionStatus.textContent = "Access check failed";
            showMessage(
                error.message || "Unable to initialize Tasks & Assignments.",
                "error"
            );

            saveButton.disabled = true;
            refreshButton.disabled = true;
        }
    })();
});
