//read the value from .env file
const org_id = "846402869";
const connection_name = "desk_api_conn";
let current_ticket_id = null;
// --- Onload: Initialize extension and check current ticket ---
window.onload = function () {
  ZOHODESK.extension.onload().then(checkCurrentTicket);
};

// --- Main functions:: Reads the current ticket and decides what to fetch ---
function checkCurrentTicket() {
  ZOHODESK.get("ticket")
    .then((res) => {
      const ticket = res.ticket;
      current_ticket_id = ticket.id;
      const isParent = ticket.cf?.cf_is_parent_ticket === "true";
      const isChild = ticket.cf?.cf_is_child_tickets === "true";
      const parentCard = document.getElementById("parentCard");
      parentCard.classList.add("hidden");

      if (isChild) {
        const parentId = ticket.cf.cf_parent_ticket_id;
        parentCard.classList.remove("hidden");
        setText("[data-c='card-title-peer']", "Peer Child Ticket");
        fetchParent(parentId);
        fetchChildren(parentId);
      } else if (isParent) {
        h3.textContent = "Child Ticket";
        const parentId = ticket.id;
        fetchChildren(parentId);
        setText("[data-c='card-title-peer']", "Child Ticket");

      } else {
        console.log("Ticket is neither parent nor child");
        showNeitherParentNorChild();
      }
    })
    .catch((err) => {
      console.log("Error fetching current ticket:", err);
      showNeitherParentNorChild();
    });
}

// --- Fetch functions ---
// FETCH PARENT TICKET DETAILS
function fetchParent(parentId) {
  ZOHODESK.request({
    url: `https://desk.zoho.com/api/v1/tickets/${parentId}`,
    headers: {
      "Content-Type": "application/json",
    },
    postBody: {},
    type: "GET",
    data: { orgId: org_id },
    connectionLinkName: connection_name,
  }).then((res) => {
    const outer = typeof res === "string" ? JSON.parse(res) : res;
    const inner = JSON.parse(outer.response);
    const parent = inner.statusMessage;
    fetchContact(parent.contactId);
    fetchDepartment(parent.departmentId);
    fetchTicketOwner(parent.assigneeId);
    renderParent(mapTicket(parent));
  });
}

// FETCH CHILD TICKETS LIST
function fetchChildren(parentId) {
  ZOHODESK.request({
    url: `https://desk.zoho.com/api/v1/tickets/search?from=0&limit=100&customField1=cf_parent_ticket_id:${parentId}`,
    type: "GET",
    headers: {
      "Content-Type": "application/json",
      orgId: org_id,
    },
    postBody: {},
    connectionLinkName: connection_name,
  })
    .then((res) => {
      const outer = typeof res === "string" ? JSON.parse(res) : res;
      const body = JSON.parse(outer.response);
      const children = body.statusMessage;

      const peers = (children.data || []).filter(
        (t) => String(t.id) !== String(current_ticket_id)
      );

      //const peers = children.data || [];

     console.log("Filtered Children:", peers);

      if (!peers.length) {
        showNoChildText();
        return;
      }

      peers.forEach((t) => renderChild(mapTicket(t)));
    })
    .catch((err) => {
      console.error("Child fetch failed", err);
      showNoChildText();
    });
}

//  --- FETCH HELPERS: Fetch additional data ---
// FETCH CONTACT DETAILS
function fetchContact(id) {
  return ZOHODESK.request({
    url: `https://desk.zoho.com/api/v1/contacts/${id}`,
    headers: { "Content-Type": "application/json" },
    postBody: {},
    type: "GET",
    data: { orgId: org_id },
    connectionLinkName: connection_name,
  }).then((r) => {
    const outer = typeof r === "string" ? JSON.parse(r) : r;
    const res = JSON.parse(outer.response);
    // extract the actual contact details
    const contact = res.statusMessage || {};
    const firstName = contact.firstName || "";
    const lastName = contact.lastName || "";
    const fullName = (firstName + " " + lastName).trim() || "—";
    // update UI directly
    setText("[data-p='name']", fullName);
    // return the contact object in case you need it later
    return contact;
  });
}

// FETCH DEPARTMENT DETAILS
function fetchDepartment(id) {
  return ZOHODESK.request({
    url: `https://desk.zoho.com/api/v1/departments/${id}`,
    headers: { "Content-Type": "application/json" },
    postBody: {},
    type: "GET",
    data: { orgId: org_id },
    connectionLinkName: connection_name,
  }).then((r) => {
    const outer = typeof r === "string" ? JSON.parse(r) : r;
    const res = JSON.parse(outer.response);
    const dept = res.statusMessage || {};
    const deptName = dept.name || "—";
    setText("[data-p='department'] .ticketData", deptName);
    return dept;
  });
}

// FETCH TICKET OWNER DETAILS
function fetchTicketOwner(id) {
  return ZOHODESK.request({
    url: `https://desk.zoho.com/api/v1/agents/${id}`,
    headers: { "Content-Type": "application/json" },
    postBody: {},
    type: "GET",
    data: { orgId: org_id },
    connectionLinkName: connection_name,
  }).then((r) => {
    const outer = typeof r === "string" ? JSON.parse(r) : r;
    const res = JSON.parse(outer.response);
    const owner = res.statusMessage || {};
    const firstName = owner.firstName || "";
    const lastName = owner.lastName || "";
    const fullName = (firstName + " " + lastName).trim() || "—";
    setText("[data-p='owner'] .ticketData", fullName);

    return owner;
  });
}

// --- Render functions ---
// RENDER PARENT TICKET DETAILS
function renderParent(t) {
  if (!t.ticketNumber && (!t.contact.name || t.contact.name === "—")) {
    document.getElementById("parentCard").classList.add("hidden");
    return;
  }
  const parentCard = document.getElementById("parentCard");

  // Make card clickable
  parentCard.classList.add("clickable");
  parentCard.onclick = () => openTicketInDesk(t.id);

  // Populate data
  setText("[data-p='ticketNumber']", `#${t.ticketNumber}`);
  setText("[data-p='created'] .ticketData", formatDate(t.createdTime));

  const parentDueEl = document.querySelector("[data-p='due'] .ticketData");
  parentDueEl.textContent = formatDate(t.dueDate);
  applyDueStatusToElement(t.dueDate, parentDueEl);

  setText("[data-p='owner'] .ticketData", t.assignee.name); // <- use mapped name
  const statusSpan = document.querySelector("[data-p='status'] .ticketData");
statusSpan.textContent = t.status || "—";
statusSpan.className = "status-badge";

if (t.status === "Open" && isOverdue(t.dueDate)) {
  statusSpan.style.color = "red"; // red
} else {
  statusSpan.style.color = getStatusColor(t.status);
}

}

// RENDER CHILD TICKETS LIST
function renderChild(t) {
  if (
    !t.ticketNumber &&
    (!t.contact.name || t.contact.name === "—") &&
    !t.status
  ) {
    return; // skip rendering empty ticket
  }
  const container = document.getElementById("peerChildContainer");
  const wrapper = container.querySelector(".ticket-peer");

  const template = container.querySelector(".child-template");
  const clone = template.cloneNode(true);

  clone.classList.remove("child-template", "hidden");
  wrapper.classList.remove("hidden");

  clone.style.display = ""; // show cloned row
  clone.classList.remove("child-template");
  clone.classList.add("clickable");
  clone.onclick = () => openTicketInDesk(t.id);
  // Populate data
  clone.querySelector("[data-c='ticketNumber']").textContent =
    `#${t.ticketNumber}`;
  clone.querySelector("[data-c='name']").textContent = t.contact.name;
  clone.querySelector("[data-c='created']").textContent = formatDate(
    t.createdTime,
  );
  const dueEl = clone.querySelector("[data-c='due']");
  dueEl.textContent = formatDate(t.dueDate);
  applyDueStatusToElement(t.dueDate, dueEl);

  clone.querySelector("[data-c='owner']").textContent = t.assignee.name;

  fetchDepartment(t.departmentId).then((dept) => {
    clone.querySelector("[data-c='department']").textContent = dept.name || "—";
  });

  const statusEl = clone.querySelector(".status-color");
statusEl.textContent = t.status;

if (t.status === "Open" && isOverdue(t.dueDate)) {
  statusEl.style.color = "red"; // red
} else {
  statusEl.style.color = getStatusColor(t.status);
}

  container.appendChild(clone);

  const sep = document.createElement("div");
  sep.className = "separator";
  container.appendChild(sep);
}

// --- Utility functions ---
// MAP TICKET DATA
function mapTicket(ticket) {
  return {
    id: ticket.id,
    ticketNumber: ticket.number || ticket.ticketNumber,
    subject: ticket.subject,
    createdTime: ticket.createdTime,
    dueDate: ticket.dueDate,
    status: ticket.status || ticket.statusType,
    departmentId: ticket.departmentId,
    contactId: ticket.contact?.id || null,
    contact: {
      firstName: ticket.contact?.firstName || "—",
      lastName: ticket.contact?.lastName || "",
      get name() {
        return (
          ((this.firstName || "") + " " + (this.lastName || "")).trim() || "—"
        );
      },
    },
    assigneeId: ticket.assignee?.id || null,
    assignee: {
      firstName: ticket.assignee?.firstName || "",
      lastName: ticket.assignee?.lastName || "",
      get name() {
        return (
          ((this.firstName || "") + " " + (this.lastName || "")).trim() || "—"
        );
      },
    },
  };
}

// SHOW NO CHILD TICKETS TEXT
function showNoChildText() {
  const container = document.getElementById("peerChildContainer");
  const emptyText = container.querySelector(".no-child-text");
  if (emptyText) emptyText.style.display = "block";
}

// SHOW NEITHER PARENT NOR CHILD MESSAGE
function showNeitherParentNorChild() {
  const peerContainer = document.getElementById("peerChildContainer");
  const parentCard = document.getElementById("parentCard");
  // Hide parent card entirely and all peer-child related UI
  if (parentCard) parentCard.classList.add("hidden");
  peerContainer
    .querySelectorAll(".ticket-peer, .card-title, .separator, .no-child-text")
    .forEach((el) => el.classList.add("hidden"));
  let msg = peerContainer.querySelector(".neither-ticket-text");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "neither-ticket-text";
    msg.textContent = "Ticket is neither a child nor a parent";
    peerContainer.appendChild(msg);
  }
  msg.style.display = "block";
}

// SET TEXT CONTENT UTILITY
function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

// GET STATUS COLOR UTILITY
function getStatusColor(status) {
  const colors = {
    Closed: "#e74c3c",
    "In Progress": "#3498db",
    Open: "#2ecc71",
    "On Hold": "#e67e22",
    Escalated: "#f1c40f",
  };
  return colors[status] || "#7f8c8d";
}

// FORMAT DATE UTILITY
function formatDate(dateInput) {
  if (!dateInput) return "—";
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
// APPLY DUE STATUS TO ELEMENT
function applyDueStatusToElement(dueDate, el) {
  if (!el || !dueDate) return;

  const due = new Date(dueDate);
  const now = new Date();

  const existing = el.querySelector(".overdue-text");
  if (existing) existing.remove();

  if (due < now) {
    const diffTime = now - due;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const overdueText = document.createElement("span");
    overdueText.className = "overdue-text";
    overdueText.textContent =
      ` - Late by ${diffDays} day${diffDays !== 1 ? "s" : ""} ` +
      `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    overdueText.style.color = "red";
    overdueText.style.fontWeight = "600";
    overdueText.style.marginLeft = "6px";

    el.appendChild(overdueText);
  }
}
// CHECK IF TICKET IS OVERDUE
function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}


// TO ALLOW OPENING TICKET IN ZOHO DESK WHEN CLICKED
function openTicketInDesk(ticketId) {
  ZOHODESK.invoke("ROUTE_TO", {
    entity: "ticket",
    id: ticketId,
    target : "_blank"
  });
}

