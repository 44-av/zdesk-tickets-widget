console.log("It's your bundled js file");
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setText(el, text) {
  if (el) el.textContent = text;
}
function fillParentTicket(t) {
  const root = document.getElementById("parentCard");

  root.querySelector('[data-p="ticketNumber"]').textContent = `#${t.ticketNumber}`;
  root.querySelector('[data-p="name"]').textContent = t.contact?.lastName || "-";
  root.querySelector('[data-p="created"]').textContent = `Created On: ${formatDate(t.createdTime)}`;
  root.querySelector('[data-p="due"]').textContent = `Due: ${formatDate(t.dueDate)}`;
  root.querySelector('[data-p="department"]').textContent = `Department: ${t.department?.name || "-"}`;
  root.querySelector('[data-p="owner"]').textContent = `Owner: ${t.assignee?.name || "-"}`;

  const statusEl = root.querySelector('[data-p="status"]');
  statusEl.textContent = `Status: ${t.status}`;
  statusEl.classList.toggle("closed", t.status === "Closed");
  statusEl.classList.toggle("open", t.status !== "Closed");
}

function renderPeers(children, currentId) {
  const container = document.getElementById("peerChildContainer");
  const template = container.querySelector(".child-template");

  // safety cleanup if function runs again
  container.querySelectorAll(".ticket-row:not(.child-template), .row-divider")
    .forEach(el => el.remove());

  children
    .filter(t => t.id !== currentId)
    .forEach((t, i) => {

      // divider only BETWEEN rows
      if (i > 0) {
        const divider = document.createElement("div");
        divider.className = "row-divider";
        container.appendChild(divider);
      }

      const row = template.cloneNode(true);
      row.style.display = "grid";
      row.classList.remove("child-template");

      setText(row.querySelector('[data-c="ticketNumber"]'), `#${t.ticketNumber}`);
      setText(row.querySelector('[data-c="name"]'), t.contact?.lastName || "-");
      setText(row.querySelector('[data-c="created"]'), `Created On: ${formatDate(t.createdTime)}`);
      setText(row.querySelector('[data-c="due"]'), `Due: ${formatDate(t.dueDate)}`);
      setText(row.querySelector('[data-c="department"]'), `Department: ${t.department?.name || "-"}`);
      setText(row.querySelector('[data-c="owner"]'), `Owner: ${t.assignee?.name || "-"}`);

      const statusEl = row.querySelector('[data-c="status"]');
      statusEl.textContent = `Status: ${t.status}`;
      statusEl.classList.remove("open", "closed");
      statusEl.classList.add(t.status === "Closed" ? "closed" : "open");

      container.appendChild(row);
    });
}

