
document.getElementById("admin-login-form")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const form = event.target;

        const username = form.elements.username.value.trim();
        const password = form.elements.password.value;

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            
form.reset();
window.location.href = "admin-dashboard.html";


        } catch (error) {
            alert("Login Failed: " + error.message);
        }
    });
