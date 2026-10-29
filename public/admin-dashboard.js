
/* Pet Adoption & Rescue Admin Dashboard */

async function loadDashboard() {
    try {
        const response = await fetch("/api/admin/dashboard-data");

        if (response.status === 401) {
            window.location.href = "admin-login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load dashboard");
        }

        const data = await response.json();

        showTable("adoption-list", data.adoptions, [
            ["Applicant", "fullName"],
            ["Pet", "petName"],
            ["Status", "status"]
        ]);

        showTable("rescue-list", data.rescues, [
            ["Reporter", "reporterName"],
            ["Animal", "animalType"],
            ["Location", "location"],
            ["Condition", "condition"],
            ["Status", "status"]
        ]);

    } catch (error) {
        document.getElementById("adoption-list").textContent =
            error.message;
        document.getElementById("rescue-list").textContent =
            error.message;
    }
}


function showTable(containerId, records, columns) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    if (!Array.isArray(records) || records.length === 0) {
        container.textContent = "No records found.";
        return;
    }

    const table = document.createElement("table");
    table.className = "admin-table";

    const headerRow = document.createElement("tr");

    columns.forEach(([heading]) => {
        const th = document.createElement("th");
        th.textContent = heading;
        headerRow.appendChild(th);
    });

    if (containerId === "rescue-list") {
        const th = document.createElement("th");
        th.textContent = "Update Status";
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    records.forEach(record => {
        const row = document.createElement("tr");

        columns.forEach(([, field]) => {
            const cell = document.createElement("td");
            cell.textContent = record[field] ?? "-";
            row.appendChild(cell);
        });

        if (containerId === "rescue-list") {
            const cell = document.createElement("td");

            const select = document.createElement("select");

            ["Pending", "In Progress", "Rescued"].forEach(status => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                select.appendChild(option);
            });

            select.value = record.status;

            const button = document.createElement("button");
            button.textContent = "Update";

            button.addEventListener("click", async () => {
                button.disabled = true;
                button.textContent = "Saving...";

                try {
                    const response = await fetch(
                        `/api/admin/rescues/${record._id}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                status: select.value
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Update failed");
                    }

                    const result = await response.json();

                    record.status = result.status;

                    const statusIndex = columns.findIndex(
                        ([, field]) => field === "status"
                    );

                    if (statusIndex !== -1) {
                        row.children[statusIndex].textContent =
                            result.status;
                    }

                    alert("Rescue Status Updated Successfully!");

                } catch (error) {
                    alert(error.message);
                } finally {
                    button.disabled = false;
                    button.textContent = "Update";
                }
            });

            cell.appendChild(select);
            cell.appendChild(button);
            row.appendChild(cell);
        }

        table.appendChild(row);
    });

    container.appendChild(table);
}


document.getElementById("logoutButton")
    .addEventListener("click", async () => {
        try {
            const response = await fetch("/api/admin/logout", {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            window.location.href = "admin-login.html";
        } catch (error) {
            alert(error.message);
        }
    });

loadDashboard();

/* Display Contact Messages in Admin Dashboard */

async function loadContactMessages() {
    const container = document.getElementById("contact-list");

    if (!container) return;

    try {
        const response = await fetch("/api/admin/contacts");

        if (response.status === 401) {
            window.location.href = "admin-login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load contact messages");
        }

        const data = await response.json();

        container.replaceChildren();

        if (!data.contacts || data.contacts.length === 0) {
            container.textContent = "No contact messages yet.";
            return;
        }

        const table = document.createElement("table");

        const header = document.createElement("tr");

        ["Name", "Email", "Subject", "Message", "Status"]
            .forEach(text => {
                const th = document.createElement("th");
                th.textContent = text;
                header.appendChild(th);
            });

        table.appendChild(header);

        data.contacts.forEach(contact => {
            const row = document.createElement("tr");

            [
                contact.name,
                contact.email,
                contact.subject,
                contact.message,
                contact.status
            ].forEach(value => {
                const td = document.createElement("td");
                td.textContent = value || "-";
                row.appendChild(td);
            });

            table.appendChild(row);
        });

        container.appendChild(table);

    } catch (error) {
        container.textContent = "Error loading contact messages.";
        console.error(error);
    }
}

loadContactMessages();
