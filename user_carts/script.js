document.addEventListener("DOMContentLoaded", async () => {
    const cartItemsContainer = document.getElementById("cart-items");
    const totalSumElement = document.getElementById("total-sum-value");
    const cartCountElement = document.getElementById("cart-count");
    const cartCountMainElement = document.getElementById("cart-count-main");
    // Функция для загрузки данных о корзине
    async function loadCartItems() {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error("userId не найден в localStorage");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/api/cart-items?userId=${userId}`);
            if (!response.ok) {
                throw new Error("Ошибка при загрузке данных о корзине");
            }

            const data = await response.json();
            renderCartItems(data.cartItems);
        } catch (error) {
            console.error("Ошибка при загрузке данных о корзине:", error);
        }
    }

// Функция для отображения путевок в корзине
function renderCartItems(cartItems) {
    cartItemsContainer.innerHTML = ""; // Очищаем контейнер

    cartItems.forEach((item) => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("cart-item");
        cartItemElement.dataset.tripId = item.tripId; // Добавляем tripId как атрибут

        // Название путевки
        const titleElement = document.createElement("div");
        titleElement.classList.add("cart-item-title");
        titleElement.textContent = item.title;

        // Количество путевок
        const quantityContainer = document.createElement("div");
        quantityContainer.classList.add("cart-item-quantity-container");

        const decreaseButton = document.createElement("button");
        decreaseButton.textContent = "-";
        decreaseButton.classList.add("quantity-button");
        decreaseButton.dataset.tripId = item.tripId;
        decreaseButton.addEventListener("click", handleDecreaseQuantity);

        const quantityElement = document.createElement("span");
        quantityElement.classList.add("cart-item-quantity");
        quantityElement.textContent = item.quantity;
        quantityElement.dataset.tripId = item.tripId;

        const increaseButton = document.createElement("button");
        increaseButton.textContent = "+";
        increaseButton.classList.add("quantity-button");
        increaseButton.dataset.tripId = item.tripId;
        increaseButton.addEventListener("click", handleIncreaseQuantity);

        quantityContainer.appendChild(decreaseButton);
        quantityContainer.appendChild(quantityElement);
        quantityContainer.appendChild(increaseButton);

        // Кнопка для удаления путевки
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "✖"; // Крестик
        deleteButton.classList.add("delete-button");
        deleteButton.dataset.tripId = item.tripId;
        deleteButton.addEventListener("click", handleDeleteTrip);

        // Добавляем элементы в DOM
        cartItemElement.appendChild(titleElement);
        cartItemElement.appendChild(quantityContainer);
        cartItemElement.appendChild(deleteButton);
        cartItemsContainer.appendChild(cartItemElement);
    });
}

    // Обработчик уменьшения количества путевок
    async function handleDecreaseQuantity(event) {
        const tripId = event.target.dataset.tripId;
        const userId = localStorage.getItem("userId");

        // Получаем текущее значение количества путевок из DOM
        const quantityElement = event.target.parentElement.querySelector(".cart-item-quantity");
        let currentQuantity = parseInt(quantityElement.textContent);

        // Увеличиваем количество, но не больше 99
        if (currentQuantity > 0) {
            currentQuantity -= 1;
        }

        try {
            const response = await fetch(`http://localhost:8081/api/cart-items/${tripId}?userId=${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ quantity: currentQuantity }), // Увеличиваем на 1
            });

            if (!response.ok) {
                throw new Error("Ошибка при обновлении количества путевок");
            }

            // Обновляем корзину
            await loadCartItems();
            await updateCartCount();
            await updateTotalSum(); // Обновляем итоговую сумму
        } catch (error) {
            console.error("Ошибка при обновлении количества путевок:", error);
        }
    }

    // Обработчик увеличения количества путевок
    async function handleIncreaseQuantity(event) {
        const tripId = event.target.dataset.tripId;
        const userId = localStorage.getItem("userId");

        // Получаем текущее значение количества путевок из DOM
        const quantityElement = event.target.parentElement.querySelector(".cart-item-quantity");
        let currentQuantity = parseInt(quantityElement.textContent);

        // Увеличиваем количество, но не больше 99
        if (currentQuantity < 99) {
            currentQuantity += 1;
        }

        try {
            const response = await fetch(`http://localhost:8081/api/cart-items/${tripId}?userId=${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ quantity: currentQuantity }), // Увеличиваем на 1
            });

            if (!response.ok) {
                throw new Error("Ошибка при обновлении количества путевок");
            }

            // Обновляем корзину
            await loadCartItems();
            await updateCartCount();
            await updateTotalSum(); // Обновляем итоговую сумму
        } catch (error) {
            console.error("Ошибка при обновлении количества путевок:", error);
        }
    }

    // Обработчик удаления путевки
    async function handleDeleteTrip(event) {
        const tripId = event.target.dataset.tripId;
        const userId = localStorage.getItem("userId");

        try {
            const response = await fetch(`http://localhost:8081/api/cart-items/${tripId}?userId=${userId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Ошибка при удалении путевки");
            }

            // Обновляем корзину
            await loadCartItems();
            await updateCartCount();
            await updateTotalSum(); // Обновляем итоговую сумму
        } catch (error) {
            console.error("Ошибка при удалении путевки:", error);
        }
    }


    async function updateCartCount() {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error("userId не найден в localStorage");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/api/cart-count?userId=${userId}`);
            if (!response.ok) {
                throw new Error(`Ошибка при получении количества путевок: ${response.statusText}`);
            }

            const data = await response.json();
            cartCountElement.textContent = data.cartCount; // Обновляем общее количество путевок в навигации
            cartCountMainElement.textContent = data.cartCount; // Обновляем общее количество путевок в основном содержимом
        } catch (error) {
            console.error("Ошибка при получении количества путевок:", error);
        }
    }

    // Функция для обновления итоговой суммы
    async function updateTotalSum() {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error("userId не найден в localStorage");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/api/cart-total?userId=${userId}`);
            if (!response.ok) {
                throw new Error("Ошибка при получении итоговой суммы");
            }

            const data = await response.json();
            totalSumElement.textContent = data.totalSum;
        } catch (error) {
            console.error("Ошибка при получении итоговой суммы:", error);
        }
    }

    // Загружаем данные о корзине при загрузке страницы
    await loadCartItems();
    await updateCartCount();
    await updateTotalSum(); // Загружаем итоговую сумму
});