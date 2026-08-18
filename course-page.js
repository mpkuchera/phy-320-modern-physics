document.querySelectorAll(".lesson-content li").forEach((item) => {
  if (!item.textContent.trim().endsWith("*")) {
    return;
  }

  const badge = document.createElement("span");
  badge.className = "evaluation-badge";
  badge.textContent = "★ Evaluation";
  const badgeHost = item.querySelector(":scope > p:last-child") || item;
  badgeHost.append(" ", badge);
});
