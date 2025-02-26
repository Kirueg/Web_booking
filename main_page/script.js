const email = localStorage.getItem('email');
const token = localStorage.getItem('token');
const isLogg = localStorage.getItem('isLoggedIn');
const login = localStorage.getItem('login');
const userId = localStorage.getItem('userId');

console.log(isLogg);
console.log(email);
console.log(token);
console.log(login);
console.log(userId);

if (isLogg === 'true') {
    const lks = document.getElementById('enter_lks');
    lks.textContent = 'Профиль';
    lks.href = '../edit_profile/profile.html';

    const ava = document.getElementsByClassName('avatarka')[0];

    // Отображаем кнопку "Корзина"
    const cartLink = document.getElementById('cart-link');
    cartLink.style.display = 'inline-block';

}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const container = document.querySelector(".card-container");
        const searchInput = document.getElementById("searchInput"); // Получаем элемент поиска
        const bookingForm = document.querySelector(".booking-form"); // Получаем форму поиска

        // Обновляем количество путевок в корзине при загрузке страницы
        await updateCartCount();

        const loadTrips = async (searchTerm = "", checkin = "", checkout = "", destination = "") => {
            const url = new URL("http://localhost:8081/api/trips");
            url.searchParams.append("search", searchTerm);
            url.searchParams.append("checkin", checkin);
            url.searchParams.append("checkout", checkout);
            url.searchParams.append("destination", destination);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Ошибка при загрузке данных с сервера");
            }

            const trips = await response.json();
            container.innerHTML = "";

            trips.forEach((trip) => {
                const card = document.createElement("div");
                card.classList.add("card");

                const link = document.createElement("a");
                link.href = `../booking_page/booking_template.html?id=${trip.id}`;
                link.classList.add("image-card");

                const image = document.createElement("img");
                image.src = "http://localhost:8081" + trip.imagePath;
                image.alt = trip.title;
                link.appendChild(image);

                // Добавляем название путевки
                const title = document.createElement("div");
                title.classList.add("trip-title");
                title.textContent = trip.title;
                link.appendChild(title);

                const deleteIcon = document.createElement("div");
                deleteIcon.classList.add("delete-icon");
                deleteIcon.innerHTML = "<span>&times;</span>";
                deleteIcon.dataset.id = trip.id;

                // Проверка, является ли пользователь суперпользователем
                if (login === 'admin' && email === 'admin@admin.com') {
                    deleteIcon.style.display = 'inline-block'; // Показываем иконку удаления
                } else {
                    deleteIcon.style.display = 'none'; // Скрываем иконку удаления
                }

                deleteIcon.addEventListener("click", async (event) => {
                    event.preventDefault();

                    // Проверка, является ли пользователь суперпользователем
                    if (login !== 'admin' || email !== 'admin@admin.com') {
                        alert("У вас нет прав для удаления путевок.");
                        return;
                    }

                    const tripID = deleteIcon.dataset.id;
                    const deleteResponse = await fetch(`http://localhost:8081/api/trips/${tripID}`, {
                        method: "DELETE",
                        headers: {
                            'Authorization': `Bearer ${token}` // Добавляем токен авторизации
                        }
                    });

                    if (deleteResponse.ok) {
                        card.remove();
                        await updateCartCount();
                        console.log("Путевка удалена:", tripID);
                    } else {
                        console.error("Ошибка при удалении путевки:", deleteResponse.status);
                    }
                });

                card.appendChild(link);
                card.appendChild(deleteIcon);
                container.appendChild(card);
            });
        };

        // Загружаем все путевки при загрузке страницы
        loadTrips();

        // Обработчик события для поиска
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                const searchTerm = searchInput.value.trim();
                loadTrips(searchTerm);
            });
        }

        // Обработчик события для формы поиска
        if (bookingForm) {
            bookingForm.addEventListener("submit", (event) => {
                event.preventDefault(); // Предотвращаем отправку формы

                const destination = document.getElementById("destination").value.trim();
                const checkin = document.getElementById("checkin").value;
                const checkout = document.getElementById("checkout").value;

                loadTrips("", checkin, checkout, destination);
            });
        }

    } catch (error) {
        console.error("Ошибка:", error);
    }
});

async function updateCartCount() {
    try {
        const userId = localStorage.getItem('userId'); // Получаем ID пользователя
        if (!userId) {
            console.error('userId не найден в localStorage');
            return;
        }

        const response = await fetch(`http://localhost:8081/api/cart-count?userId=${userId}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Количество путевок в корзине:', data.cartCount);
            const cartCountElement = document.getElementById('cart-count');
            if (cartCountElement) {
                cartCountElement.textContent = data.cartCount;
            } else {
                console.error('Элемент cart-count не найден');
            }
        } else {
            console.error('Ошибка при получении количества путевок:', response.status);
        }
    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}