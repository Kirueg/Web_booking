// Файл авторизации (например, login.js)
document.querySelector('.authorization_form').addEventListener('submit', function (event) {
    event.preventDefault(); // Предотвращаем отправку формы по умолчанию

    const email = document.querySelector('.authorization_form input[type="email"]').value.trim();
    const password = document.querySelector('.authorization_form input[type="password"]').value.trim();

    if (!email || !password) {
        generalError.textContent = 'Пожалуйста, заполните все поля';
        generalError.classList.remove('hidden');
        return; // Прерываем выполнение, если есть пустые поля
    }

    // Отправка данных на сервер
    fetch('http://localhost:8081/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: email, password: password }),
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.text().then(errorText => {
                throw new Error(errorText);
            });
        }
    })
    .then(data => {
        alert('Авторизация успешна! Токен: ' + data.token);
        // Сохраняем токен в localStorage или sessionStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.login);
        localStorage.setItem('isLoggedIn', 'true'); // Сохраняем состояние авторизации

        // Получаем логин и ID по email
        return fetch(`http://localhost:8081/login-by-email?email=${data.login}`)
            .then(response => {
                if (response.ok) {
                    return response.json(); // Преобразуем ответ в JSON
                } else {
                    throw new Error('Ошибка при получении логина и ID по email');
                }
            })
            .then(loginData => {
                // Сохраняем логин и ID в localStorage
                localStorage.setItem('login', loginData.login);
                localStorage.setItem('userId', loginData.id); // Сохраняем ID

                // Перенаправляем пользователя на страницу профиля или другую страницу
                window.location.href = "../main_page/index.html"; // Замените на ваш путь к странице профиля
            });
    })
    .catch(error => {
        console.error("Ошибка:", error.message); // Вывод сообщения об ошибке в консоль
        generalError.textContent = 'Логин или пароль неверны';
        generalError.classList.remove('hidden');
    });
});

function goBack() {
    window.history.back(); // Возвращает на предыдущую страницу
}