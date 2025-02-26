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
}

// Обработчик изменения файла (загрузка изображения)
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Создаем объект изображения
            const img = new Image();
            img.src = e.target.result;

            // Обработчик загрузки изображения
            img.onload = function() {
                // Создаем canvas для масштабирования изображения
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Устанавливаем размеры canvas
                canvas.width = 600; // Фиксированная ширина
                canvas.height = 400; // Фиксированная высота

                // Масштабируем изображение
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Обновляем изображение на странице
                document.getElementById('preview_ava').src = canvas.toDataURL('image/jpeg');
            }
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById("submitButton").addEventListener("click", async () => {
    // Проверка, является ли пользователь суперпользователем
    if (login !== 'admin' || email !== 'admin@admin.com') {
        alert("У вас нет прав для добавления путевок.");
        return; // Прерываем выполнение, если пользователь не суперпользователь
    }

    const formData = new FormData();
    
    // Получаем значения полей формы
    const tripTitle = document.getElementById("tripTitle").value;
    const tripStartDate = document.getElementById("tripStartDate").value;
    const tripEndDate = document.getElementById("tripEndDate").value;
    const tripPrice = document.getElementById("tripPrice").value;
    const tripDescription = document.getElementById("tripDescription").value;
    const image = document.getElementById("fileInput").files[0];

    // Проверка дат
    if (tripStartDate && tripEndDate && tripStartDate > tripEndDate) {
        alert("Ошибка: Дата начала не может быть позже даты окончания.");
        return; // Прерываем выполнение, если дата начала позже даты окончания
    }

    // Добавляем данные в FormData
    formData.append("tripTitle", tripTitle);
    formData.append("tripStartDate", tripStartDate);
    formData.append("tripEndDate", tripEndDate);
    formData.append("tripPrice", tripPrice);
    formData.append("tripDescription", tripDescription);
    formData.append("image", image);

    try {
        const response = await fetch("http://localhost:8081/add-trip", {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}` // Добавляем токен авторизации
            },
            body: formData,
        });

        if (response.ok) {
            alert("Путевка успешно добавлена!");
            
            // Очищаем поля формы
            document.getElementById("tripTitle").value = "";
            document.getElementById("tripStartDate").value = "";
            document.getElementById("tripEndDate").value = "";
            document.getElementById("tripPrice").value = "";
            document.getElementById("tripDescription").value = "";
            document.getElementById("fileInput").value = ""; // Очищаем поле загрузки файла
        } else {
            const data = await response.json();
            alert("Ошибка: " + data.message);
        }
    } catch (error) {
        console.error("Произошла ошибка:", error);
        alert("Произошла ошибка при отправке данных.");
    }
});