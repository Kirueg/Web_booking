function goBack() {
  window.history.back(); // Возвращает на предыдущую страницу
}

function goBackx2() {
  window.history.go(-2);
}


document.getElementById('registrationForm').addEventListener('submit', function (event) {
event.preventDefault(); // Предотвращаем отправку формы по умолчанию

const login = document.getElementById('login').value.trim();
const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value.trim();
const confirmPassword = document.getElementById('confirmPassword').value.trim();

if (!login || !email || !password || !confirmPassword) {
  generalError.textContent = 'Пожалуйста, заполните все поля';
  generalError.classList.remove('hidden');
  return; // Прерываем выполнение, если есть пустые поля
}

// Проверка на совпадение паролей
if (password !== confirmPassword) {
  generalError.textContent = 'Пароли не совпадают';
  generalError.classList.remove('hidden');  
  return;
}

// Отправка данных на сервер
fetch('http://localhost:8081/account', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ login, email, password }),
})
  .then(response => {
    if (response.ok) {
      // После успешной регистрации получаем логин и ID по email
      return fetch(`http://localhost:8081/login-by-email?email=${email}`)
        .then(response => {
          if (response.ok) {
            return response.json(); // Преобразуем ответ в JSON
          } else {
            throw new Error('Ошибка при получении логина и ID по email');
          }
        })
        .then(data => {
          // Сохраняем логин, email и ID в localStorage
          localStorage.setItem('login', data.login);
          localStorage.setItem('email', email);
          localStorage.setItem('userId', data.id); // Сохраняем ID
          localStorage.setItem('isLoggedIn', 'true'); // Устанавливаем флаг входа
          window.location.href = '../main_page/index.html'; // Перенаправление на главную страницу
        });
    } else {
      return response.text().then(errorText => {
        generalError.textContent = 'Почта уже занята';
        generalError.classList.remove('hidden');      });
    }
  })
  .catch(error => {
    generalError.textContent = 'Че то не то';
    generalError.classList.remove('hidden');  });
});