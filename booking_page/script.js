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
        // Получаем ID путевки из URL
        const urlParams = new URLSearchParams(window.location.search);
        const tripID = urlParams.get("id");
        if (!tripID) {
            throw new Error("Trip ID is missing");
        }

        // Запрос данных с сервера
        const response = await fetch(`http://localhost:8081/api/trips/${tripID}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const trip = await response.json();
        console.log("Данные с сервера:", trip); // Вывод данных в консоль

        // Заполняем данные на странице
        document.title = trip.title; // Устанавливаем заголовок страницы

        // Обработка пути к изображению
        document.querySelector("#tour-image").src = trip.imagePath.startsWith("/")
            ? "http://localhost:8081" + trip.imagePath
            : trip.imagePath;

        document.querySelector("#tour-title").textContent = trip.title;
        document.querySelector("#tour-description").textContent = trip.description;

        // Обработка дат
        document.querySelector("#tour-start-date").textContent = new Date(trip.startDate).toLocaleDateString();
        document.querySelector("#tour-end-date").textContent = new Date(trip.endDate).toLocaleDateString();

        document.querySelector("#tour-price").textContent = trip.price;
    } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
        alert("Произошла ошибка при загрузке данных о путевке.");
    }
});

const cartCountElement = document.getElementById('cart-count');
if (cartCountElement) {
    console.log('Элемент cart-count найден');
} else {
    console.error('Элемент cart-count не найден');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Запрос на получение количества путевок при загрузке страницы
    await updateCartCount();

    // Обработчик кнопки "Забронировать"
    document.querySelector('.tour-card__button').addEventListener('click', async () => {
        try {
            const userId = localStorage.getItem('userId'); // Получаем ID пользователя
            const tripID = new URLSearchParams(window.location.search).get("id"); // Получаем ID путевки из URL

            if (!userId || !tripID) {
                console.error('Не удалось получить ID пользователя или путевки');
                return;
            }

            const response = await fetch('http://localhost:8081/api/add-to-cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: parseInt(userId), tripId: parseInt(tripID) }), // Отправляем ID пользователя и путевки
            });

            if (response.ok) {
                const data = await response.json();
                console.log(data); // Проверяем, что сервер возвращает cartCount
                const cartCountElement = document.getElementById('cart-count');
                if (cartCountElement) {
                    console.log('Текущее значение cart-count:', cartCountElement.textContent);
                    cartCountElement.textContent = data.cartCount;
                    console.log('Обновленное значение cart-count:', cartCountElement.textContent);
                    alert('Путевка успешно добавлена в корзину!');
                } else {
                    console.error('Элемент cart-count не найден');
                }
            } else {
                console.error('Ошибка при добавлении в корзину:', response.status);
            }
        } catch (error) {
            console.error('Произошла ошибка:', error);
        }
    });
});

// Функция для обновления количества путевок в корзине
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