// Configuration Supabase
const SUPABASE_URL = "https://oaxpofkmtrudriyrbxvy.supabase.co";
const BUCKET_NAME = "dishes-images";
const client = supabase.createClient(SUPABASE_URL, "sb_publishable_W0bTuLBKIo_-tSVK_XfKYg_LScZ_5EY");

const cache = {};
let currentCategory = null;
const detail = document.getElementById("dish-detail");
const backButton = document.getElementById("back-button");

/**
 * Formate l'URL de l'image stockée sur Supabase
 */
function getImageUrlFromPath(imagePath) {
    if (!imagePath) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
}

/**
 * Gère l'affichage d'une catégorie et le filtrage des données
 */
async function showCategory(category) {
    const container = document.getElementById("menu");
    
    if (currentCategory === category) {
        closeMenuAnimation();
        return;
    }
    
    currentCategory = category;
    container.innerHTML = "";

    // Mise à jour visuelle des boutons de navigation (Style iOS Active)
    document.querySelectorAll("#navigation button").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute('data-cat') === category);
    });

    backButton.classList.remove("hidden");

    // Utilisation du cache pour la performance
    if (cache[category]) {
        displayCategory(cache[category]);
        return;
    }

    const { data, error } = await client
        .from("dishes")
        .select("*")
        .eq("category", category)
        .eq("available", true);

    if (error) {
        console.error("Erreur API :", error);
        return;
    }

    // Groupement par sous-catégorie
    const grouped = data.reduce((acc, dish) => {
        const sub = dish.subcategory || "_no_sub";
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(dish);
        return acc;
    }, {});

    cache[category] = grouped;
    displayCategory(grouped);
}

/**
 * Génère le DOM pour la catégorie sélectionnée
 */
function displayCategory(grouped) {
    const container = document.getElementById("menu");
    container.innerHTML = "";

    Object.entries(grouped).forEach(([sub, dishes]) => {
        const title = document.createElement("h2");
        title.textContent = sub === "_no_sub" ? "La Sélection" : sub;
        container.appendChild(title);

        const groupDiv = document.createElement("div");
        groupDiv.className = "category-group";

        dishes.forEach(dish => {
            const card = document.createElement("div");
            card.className = "card";

            const displayPrice = (dish.price === 0 || dish.price === "0")
                ? "Inclus"
                : `${dish.price} €`;

            card.innerHTML = `
                <img src="${getImageUrlFromPath(dish.image_path)}" alt="${dish.name}" loading="lazy">
                <h3>${dish.name}</h3>
                <p>${displayPrice}</p>
            `;
            card.onclick = () => showDetail(dish);
            groupDiv.appendChild(card);
        });
        container.appendChild(groupDiv);
    });

    window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
}

/**
 * Affiche les détails d'un plat dans la modal "Bottom Sheet"
 */
function showDetail(dish) {
    const displayPrice = (dish.price === 0 || dish.price === "0")
        ? "Inclus"
        : `${dish.price} €`;

    let extraContent = "";
    if (dish.description) {
        extraContent += `<p style="margin-top:20px; font-size:1.1rem; line-height:1.6; color: rgba(255,255,255,0.8);">${dish.description}</p>`;
    }
    if (dish.ingredients) {
        extraContent += `<p style="font-size:0.9rem; color: var(--accent-color); margin-top:15px; font-weight:300;">
                            <b>Ingrédients :</b> ${dish.ingredients}
                         </p>`;
    }

    detail.innerHTML = `
        <div class="zoom-container">
            <div style="width:40px; height:5px; background:rgba(255,255,255,0.2); border-radius:10px; margin: 0 auto 20px;"></div>
            <img src="${getImageUrlFromPath(dish.image_path)}" class="zoom-image">
            <div class="zoom-info">
                <h2 style="border:none; padding:0; margin: 20px 0 5px;">${dish.name}</h2>
                <div style="font-size:1.5rem; font-weight:700; color: var(--accent-color)">${displayPrice}</div>
                ${extraContent}
            </div>
            <div style="height:100px;"></div> 
        </div>
    `;
    
    detail.classList.add("active");
    detail.classList.remove("hidden");
    document.body.classList.add("overlay-open");
    
    detail.onclick = (e) => {
        if (e.target === detail) closeDetail();
    };
}

/**
 * Ferme la vue détaillée
 */
function closeDetail() {
    detail.classList.remove("active");
    setTimeout(() => detail.classList.add("hidden"), 400); 
    document.body.classList.remove("overlay-open");
}

/**
 * Réinitialise la navigation
 */
function closeMenuAnimation() {
    currentCategory = null;
    document.getElementById("menu").innerHTML = "";
    backButton.classList.add("hidden");
    document.querySelectorAll("#navigation button").forEach(btn => btn.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Gestion du bouton retour
 */
backButton.onclick = () => {
    if (detail.classList.contains("active")) {
        closeDetail();
    } else {
        closeMenuAnimation();
    }
};

/**
 * Feedback Haptique Visuel (Effet de pression iOS)
 */
function addHapticFeedback() {
    const handlePress = (e) => {
        const btn = e.target.closest("button, .card, #back-button");
        if (btn) {
            btn.style.transform = "scale(0.96)";
            btn.style.transition = "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)";
        }
    };

    const handleRelease = (e) => {
        const btn = e.target.closest("button, .card, #back-button");
        if (btn) {
            btn.style.transform = "";
        }
    };

    document.addEventListener("mousedown", handlePress);
    document.addEventListener("mouseup", handleRelease);
    document.addEventListener("touchstart", handlePress, {passive: true});
    document.addEventListener("touchend", handleRelease, {passive: true});
}

/**
 * Lancement au chargement du DOM
 */
document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("navigation");
    const labels = {
        entree: "Entrées",
        plat: "Plats",
        accompagnement: "Accompagnements", // Changé ici
        dessert: "Desserts",
        boisson: "Boissons"
    };

    Object.keys(labels).forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = labels[cat];
        btn.setAttribute('data-cat', cat);
        btn.onclick = () => showCategory(cat);
        nav.appendChild(btn);
    });

    addHapticFeedback();
});
