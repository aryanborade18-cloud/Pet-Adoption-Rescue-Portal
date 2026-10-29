
function choosePet(petName) {
    document.querySelector("#adoption-form select").value = petName;

    document.getElementById("application").scrollIntoView({
        behavior: "smooth"
    });
}

document.getElementById("adoption-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const form = event.target;

    const application = {
        fullName: form.elements.fullName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        petName: form.elements.petName.value,
        reason: form.elements.reason.value.trim()
    };

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const response = await fetch("/api/adoptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(application)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Submission failed");
        }

        alert("Adoption Application Submitted Successfully!");
        form.reset();

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Submit Application";
    }
});


document.getElementById("rescue-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const response = await fetch("/api/rescues", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Submission failed");
        }

        
alert(
    "Rescue Report Submitted Successfully!\n\n" +
    "Your Rescue ID: " + result.rescueId +
    "\n\nSave this ID to track your rescue."
);

form.reset();

// Automatically fill the tracking box
document.getElementById("rescueId").value = result.rescueId;

// Show the tracking section
document.getElementById("tracking").scrollIntoView({
    behavior: "smooth"
});


    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Submit Rescue Report";
    }
});

/* Rescue Status Tracking */

document.getElementById("trackButton").addEventListener("click", async function() {

    const rescueId = document.getElementById("rescueId").value.trim();

    const result = document.getElementById("trackingResult");

    if (rescueId === "") {
        result.textContent = "Please enter your Rescue ID.";
        return;
    }

    result.textContent = "Checking rescue status...";

    try {
        const response = await fetch(
            `/api/rescues/${encodeURIComponent(rescueId)}/status`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to check status");
        }

        result.textContent = "Rescue Status: " + data.status;

    } catch (error) {
        result.textContent = "Error: " + error.message;
    }

});

/* Contact Us Form Submission */

document.getElementById("contact-form")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const form = event.target;

        const contactData = {
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            subject: form.elements.subject.value.trim(),
            message: form.elements.message.value.trim()
        };

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Sending...";

        try {
            const response = await fetch("/api/contacts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(contactData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to send message");
            }

            alert("Message Sent Successfully!");
            form.reset();

        } catch (error) {
            alert("Error: " + error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Send Message";
        }
    });

