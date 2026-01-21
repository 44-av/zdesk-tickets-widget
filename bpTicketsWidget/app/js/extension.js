      let childTicket;
      window.onload = function () {
        ZOHODESK.extension.onload().then(function () {
          ZOHODESK.get("ticket")
            .then(function (res) {
              const ticket = res.ticket;
              console.log(res["ticket"]);

              const mapped = {
                ticketNumber: ticket.number,
                contact: { firstName: ticket.contactName },
                createdTime: ticket.createdTime,
                dueDate: ticket.dueDate,
                status: ticket.status,
                department: {
                  name: ticket.departmentName || ticket.departmentId,
                },
                assignee: { name: ticket.owner },
              };

              renderParent(mapped);
              getTicketById(ticket.cf.cf_child_ticket_id);
              
            })
            .catch(function (err) {
              console.log("ERROR TICKET READ", err);
            });
        });
      };
    async function getTicketById(ticketId) {
        try {
            const response = await ZOHODESK.request({
            url: `https://desk.zoho.com/api/v1/tickets/${ticketId}`, // Dynamic URL
            method: "GET"
            });

            const ticketData = JSON.parse(response);
            console.log("Specific Ticket Data:", ticketData);
            return ticketData;

        } catch (error) {
            console.error("Failed to fetch ticket:", error);
        }
    }
      const statusColors = {
        "Closed": "#e74c3c",       // red
        "In Progress": "#3498db",  // blue
        "Open": "#2ecc71",         // green
        "On Hold": "#e67e22",      // orange
        "Escalated": "#f1c40f"     // yellow
      };

      function getStatusColor(status) {
        return statusColors[status] || "#7f8c8d"; // fallback gray
      }

      function formatDate(dateInput) {
        return new Date(dateInput)
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .replace(",", "");
      }

      function setText(selector, text) {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
      }

      function renderParent(t) {
        setText("[data-p='ticketNumber']", `#${t.ticketNumber}`);
        setText("[data-p='name']", t.contact?.firstName || "—");
        setText("[data-p='created'] .ticketData", formatDate(t.createdTime));
        setText("[data-p='due'] .ticketData", formatDate(t.dueDate));
        const statusSpan = document.querySelector("[data-p='status'] .ticketData");
        statusSpan.textContent = t.status || "—";
        statusSpan.className = "status-badge";       // add badge class
        statusSpan.style.color = getStatusColor(t.status);
        setText("[data-p='department'] .ticketData", t.department?.name || "—");
        setText("[data-p='owner'] .ticketData", t.assignee?.name || "—");
      }

      function renderChild(t) {
        const container = document.getElementById("peerChildContainer");
        const template = container.querySelector(".child-template");

        const clone = template.cloneNode(true);
        clone.classList.remove("child-template");
        clone.style.display = "flex";

        clone.querySelector("[data-c='ticketNumber']").textContent =
          `#${t.ticketNumber}`;
        clone.querySelector("[data-c='name']").textContent =
          t.contact?.firstName || "—";
        clone.querySelector("[data-c='created']").textContent =
          "Created On: " + formatDate(t.createdTime);
        clone.querySelector("[data-c='due']").textContent =
          "Due: " + formatDate(t.dueDate);
        clone.querySelector("[data-c='department']").textContent =
          "Department: " + (t.department?.name || "—");
        clone.querySelector("[data-c='owner']").textContent =
          "Owner: " + (t.assignee?.name || "—");

          // Set status badge
          const statusEl = clone.querySelector(".status-color");
          statusEl.textContent = t.status || "—";
          statusEl.className = "status-badge";           // badge style
          statusEl.style.backgroundColor = getStatusColor(t.status);

          container.appendChild(clone);
      }