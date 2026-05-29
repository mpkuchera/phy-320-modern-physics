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
        section.className = "module";

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
              const link = document.createElement("a");
              link.className = "material-link";
              link.href = getMaterialHref(module, moduleIndex, material, materialIndex);

              const number = document.createElement("span");
              number.className = "material-number";
              number.textContent = String(materialIndex + 1).padStart(2, "0");

              const label = document.createElement("span");
              label.textContent = material.name || `Material ${materialIndex + 1}`;

              link.append(number, label);
              return link;
            })
          );
        }

        section.append(heading, links);
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
  const moduleFolder = `${String(moduleIndex).padStart(2, "0")}-${module.slug}`;
  const materialFile = `${String(materialIndex).padStart(2, "0")}-${material.slug}.html`;
  return `${moduleFolder}/${materialFile}`;
}

loadCourse();
