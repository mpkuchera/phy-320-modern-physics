async function loadCourse() {
  const title = document.querySelector("#course-title");
  const description = document.querySelector("#course-description");
  const list = document.querySelector("#lesson-list");

  try {
    const response = await fetch("course.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load course.json: ${response.status}`);
    }

    const course = await response.json();
    document.title = course.name || "Course Materials";
    title.textContent = course.name || "Course Materials";
    description.textContent = course.description || "";

    const modules = Array.isArray(course.lessons) ? course.lessons : [];
    if (modules.length === 0) {
      return;
    }

    list.replaceChildren(
      ...modules.map((module, moduleIndex) => {
        const section = document.createElement("article");
        section.className = module.placeholder ? "module module-placeholder" : "module";

        const moduleLabel = document.createElement("p");
        moduleLabel.className = "module-label";
        moduleLabel.textContent = module.optional
          ? "Optional / if time"
          : module.placeholder
            ? `Module ${String(moduleIndex + 1).padStart(2, "0")} · Later this semester`
            : `Module ${String(moduleIndex + 1).padStart(2, "0")}`;

        const heading = document.createElement("h3");
        heading.textContent = module.name || `Module ${moduleIndex + 1}`;

        const materials = Array.isArray(module.materials) ? module.materials : [];
        const links = document.createElement("div");
        links.className = "material-list";

        if (materials.length === 0) {
          const empty = document.createElement("p");
          empty.className = "module-empty";
          empty.textContent = "No materials exported for this module.";
          links.append(empty);
        } else {
          links.append(
            ...materials.map((material, materialIndex) => {
              const isPlaceholder = module.placeholder || material.placeholder || !material.file;
              const link = document.createElement(isPlaceholder ? "span" : "a");
              link.className = isPlaceholder ? "material-link material-placeholder" : "material-link";
              if (isPlaceholder) {
                link.setAttribute("aria-disabled", "true");
              } else {
                link.href = getMaterialHref(module, moduleIndex, material, materialIndex);
              }

              const number = document.createElement("span");
              number.className = "material-number";
              number.textContent = isPlaceholder
                ? module.optional ? "Maybe" : "Soon"
                : /homework/i.test(material.name || "")
                  ? "HW"
                  : "Read";

              const label = document.createElement("span");
              label.textContent = material.name || `Material ${materialIndex + 1}`;

              link.append(number, label);
              return link;
            })
          );
        }

        section.append(moduleLabel, heading, links);
        return section;
      })
    );
  } catch (error) {
    list.innerHTML = "";
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "The course manifest could not be loaded.";
    list.append(message);
    console.error(error);
  }
}

function getMaterialHref(module, moduleIndex, material, materialIndex) {
  if (material.file) {
    return material.file;
  }

  const moduleFolder = `${String(moduleIndex).padStart(2, "0")}-${module.slug}`;
  const materialFile = `${String(materialIndex).padStart(2, "0")}-${material.slug}.html`;
  return `${moduleFolder}/${materialFile}`;
}

loadCourse();
