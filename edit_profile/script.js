// Функция для управления состоянием
function useState(initialValue) {
    let state = initialValue;

    function setState(newValue) {
        state = newValue;
    }

    return [state, setState];
}

// Основная функция
function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Инициализация состояния

    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('login');
    setIsLoggedIn(false); // Обновляем состояние
    window.location.href = '../main_page/index.html'; // Перенаправление

    return;
}

const previewAva = document.getElementById('preview_ava');
const fileInput = document.getElementById('fileInput');
const generalError = document.getElementById('generalError'); // Общая ошибка
const nameInput = document.getElementById('NameUser');
const emailInput = document.getElementById('Email');
const submitButton = document.getElementById('submitButton');

// Функция для проверки всех полей
const checkInputs = () => {
    const inputs = [nameInput, emailInput];
    const isAnyEmpty = inputs.some(input => !input.value.trim()); // Проверяем, есть ли пустые поля

    if (isAnyEmpty) {
        generalError.textContent = 'Все поля должны быть заполнены';
        generalError.classList.remove('hidden');
    } else {
        generalError.textContent = '';
        generalError.classList.add('hidden');
    }

    return !isAnyEmpty; // Возвращаем true, если все поля заполнены
};

// Функция для обновления профиля
async function updateProfile(login, email) {
    const userId = localStorage.getItem('userId'); // Получаем ID пользователя из localStorage
    if (!userId) {
        alert('ID пользователя не найден');
        return;
    }

    try {
        const response = await fetch('http://localhost:8081/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(userId), // Передаем ID пользователя
                login: login,
                email: email
            })
        });

        if (response.ok) {
            const data = await response.json();
            alert(data.message);
        } else {
            const errorData = await response.json();
            alert(errorData.error);
        }
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        alert('Ошибка при обновлении профиля');
    }
}

const nickname = document.getElementById('nickname')
const emaill = document.getElementById('email')
const logg = localStorage.getItem('login');
const email = localStorage.getItem('email');
const userId = localStorage.getItem('userId');
console.log(userId)
nickname.textContent = 'Логин: ' + logg;
emaill.textContent = 'Email: ' + email;
emailInput.value = email;
nameInput.value = logg;

// Обработчик нажатия на кнопку
submitButton.addEventListener('click', async () => {
    const isValid = checkInputs();
    if (!isValid) {
        return; // Отменяем отправку, если есть ошибки
    }

    const login = nameInput.value.trim();
    const email = emailInput.value.trim();

    try {
        const response = await fetch('http://localhost:8081/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(localStorage.getItem('userId')), // Передаем ID пользователя
                login: login,
                email: email
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            localStorage.setItem('email', emailInput.value)
            localStorage.setItem('login', nameInput.value)
            window.location.reload();

            alert(data.message);
        } else {
            generalError.textContent = 'Почта уже занята';
            generalError.classList.remove('hidden');
        }
    } catch (error) {
        console.log(191919)
        generalError.textContent = 'Че то не так';
        generalError.classList.remove('hidden');
    }
});


