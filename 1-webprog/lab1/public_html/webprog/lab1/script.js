document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("graph");
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 120;

    // Фон для канваса
    const bgImage = new Image();
    bgImage.src = "../../img/cat.png";
    bgImage.onload = () => {
        drawArea(getSelectedR());
    };

    // Загрузка сохранения
    let pointsHistory = JSON.parse(localStorage.getItem("lab1_points")) || [];

    // Обработка выбора одного значения чекбоксов для X и R
    setupCheckboxGroup("x");
    setupCheckboxGroup("r");

    function setupCheckboxGroup(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
        checkboxes.forEach(cb => {
            cb.addEventListener("change", (e) => {
                if (e.target.checked) {
                    checkboxes.forEach(other => {
                        if (other !== e.target) other.checked = false;
                    });
                }
                if (name === "r") {
                    drawArea(getSelectedR());
                }
            });
        });
    }

    function getSelectedR() {
        const checked = document.querySelector('input[name="r"]:checked');
        return checked ? parseFloat(checked.value) : null;
    }

    function getSelectedX() {
        const checked = document.querySelector('input[name="x"]:checked');
        return checked ? parseFloat(checked.value) : null;
    }

    // Отрисовка области и всех точек
    function drawArea(r) {
        ctx.clearRect(0, 0, width, height);

        // отрисовка фона
        if (bgImage.complete && bgImage.naturalWidth !== 0) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.drawImage(bgImage, 0, 0, width, height);
            ctx.restore();
        }

        // область отрисовки
        if (r && r > 0) {
            const unit = scale / r;

            ctx.fillStyle = "rgba(113, 128, 150, 0.5)";
            ctx.strokeStyle = "#4a5568";
            ctx.beginPath();

            // прямоугольник
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + r * unit, centerY); // в (R, 0)
            ctx.lineTo(centerX + r * unit, centerY - (r / 2) * unit); // в (R, R/2)
            ctx.lineTo(centerX, centerY - (r / 2) * unit); // в (0, R/2)
            ctx.lineTo(centerX, centerY); // возврат в (0, 0)

            // четверть круга
            ctx.arc(centerX, centerY, (r / 2) * unit, 0, Math.PI / 2, false);

            // треугольник
            ctx.lineTo(centerX, centerY + r * unit); // в (0, -R)
            ctx.lineTo(centerX - (r / 2) * unit, centerY); // в (-R/2, 0)
            ctx.lineTo(centerX, centerY); // возврат в центр (0, 0)

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // оси координат
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = "#2d3748";
        ctx.font = "11px Arial";

        // ось X
        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(width - 10, centerY);
        ctx.stroke();

        // линия X
        ctx.beginPath();
        ctx.moveTo(width - 10, centerY);
        ctx.lineTo(width - 16, centerY - 4);
        ctx.lineTo(width - 16, centerY + 4);
        ctx.fill();

        // ось Y
        ctx.beginPath();
        ctx.moveTo(centerX, height - 10);
        ctx.lineTo(centerX, 10);
        ctx.stroke();

        // линия Y
        ctx.beginPath();
        ctx.moveTo(centerX, 10);
        ctx.lineTo(centerX - 4, 16);
        ctx.lineTo(centerX + 4, 16);
        ctx.fill();

        // метки на оси
        ctx.fillText("x", width - 12, centerY - 8);
        ctx.fillText("y", centerX + 8, 14);

        // деления осей
        const rVal = r || "R";
        const rHalfVal = r ? (r / 2) : "R/2";

        const labels = [
            { x: centerX + scale, y: centerY + 14, text: rVal },
            { x: centerX + scale / 2, y: centerY + 14, text: rHalfVal },
            { x: centerX - scale / 2, y: centerY + 14, text: "-" + rHalfVal },
            { x: centerX - scale, y: centerY + 14, text: "-" + rVal },

            { x: centerX + 8, y: centerY - scale + 4, text: rVal },
            { x: centerX + 8, y: centerY - scale / 2 + 4, text: rHalfVal },
            { x: centerX + 8, y: centerY + scale / 2 + 4, text: "-" + rHalfVal },
            { x: centerX + 8, y: centerY + scale + 4, text: "-" + rVal }
        ];

        ctx.strokeStyle = "#4a5568";
        ctx.lineWidth = 1;

        // засечки X
        [centerX - scale, centerX - scale / 2, centerX + scale / 2, centerX + scale].forEach(xPx => {
            ctx.beginPath();
            ctx.moveTo(xPx, centerY - 3);
            ctx.lineTo(xPx, centerY + 3);
            ctx.stroke();
        });

        // засечки Y
        [centerY - scale, centerY - scale / 2, centerY + scale / 2, centerY + scale].forEach(yPx => {
            ctx.beginPath();
            ctx.moveTo(centerX - 3, yPx);
            ctx.lineTo(centerX + 3, yPx);
            ctx.stroke();
        });

        labels.forEach(l => ctx.fillText(l.text, l.x, l.y));

        // отрисовка точек
        pointsHistory.forEach(pt => {
            if (r && r > 0) {
                const px = centerX + (pt.x / r) * scale;
                const py = centerY - (pt.y / r) * scale;

                ctx.beginPath();
                ctx.arc(px, py, 4, 0, 2 * Math.PI);
                ctx.fillStyle = pt.hit ? "#2f855a" : "#e53e3e";
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    // проверка попаданий
    function checkHit(x, y, r) {
        // в прямоугольник
        const inRectangle = (x >= 0 && x <= r) && (y >= 0 && y <= r / 2);

        // в четверть круга
        const inQuarterCircle = (x >= 0 && y <= 0) && (x * x + y * y <= (r / 2) * (r / 2));

        // в треугольник
        const inTriangle = (x <= 0 && y <= 0) && (y >= -2 * x - r);

        return inRectangle || inQuarterCircle || inTriangle;
    }

    // валидирование формы
    function validateForm() {
        let isValid = true;

        // X
        const xVal = getSelectedX();
        const xErr = document.getElementById("x-error");
        if (xVal === null) {
            xErr.style.display = "block";
            isValid = false;
        } else {
            xErr.style.display = "none";
        }

        // Y
        const yInput = document.getElementById("y-input").value.trim().replace(',', '.');
        const yErr = document.getElementById("y-error");
        const yNum = parseFloat(yInput);

        if (yInput === "" || isNaN(yNum) || yNum <= -5 || yNum >= 3) {
            yErr.style.display = "block";
            isValid = false;
        } else {
            yErr.style.display = "none";
        }

        // R
        const rVal = getSelectedR();
        const rErr = document.getElementById("r-error");
        if (rVal === null) {
            rErr.style.display = "block";
            isValid = false;
        } else {
            rErr.style.display = "none";
        }

        return isValid ? { x: xVal, y: yNum, r: rVal } : null;
    }

    // обновление таблички
    function renderTable() {
        const tbody = document.getElementById("results-body");
        tbody.innerHTML = "";

        pointsHistory.slice().reverse().forEach(pt => {
            const tr = document.createElement("tr");

            // преобразование времени
            const dateObj = new Date(pt.timestamp);
            const formattedDate = new Intl.DateTimeFormat("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).format(dateObj);

            const hitClass = pt.hit ? "hit-true" : "hit-false";
            const hitText = pt.hit ? "Есть пробитие" : "Промазал";

            tr.innerHTML = `
                <td>${pt.x}</td>
                <td>${pt.y}</td>
                <td>${pt.r}</td>
                <td class="${hitClass}">${hitText}</td>
                <td>${formattedDate}</td>
                <td>${pt.executionTime}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // отправка формы
    document.getElementById("point-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const startTime = performance.now();

        const validData = validateForm();
        if (!validData) return;

        const hit = checkHit(validData.x, validData.y, validData.r);
        const endTime = performance.now();
        const executionTime = (endTime - startTime).toFixed(3);

        const newPoint = {
            x: validData.x,
            y: validData.y,
            r: validData.r,
            hit: hit,
            timestamp: Date.now(),
            executionTime: executionTime
        };

        pointsHistory.push(newPoint);
        localStorage.setItem("lab1_points", JSON.stringify(pointsHistory));

        renderTable();
        drawArea(validData.r);
    });

    // отчистка истории
    document.getElementById("clear-btn").addEventListener("click", () => {
        pointsHistory = [];
        localStorage.removeItem("lab1_points");
        renderTable();
        drawArea(getSelectedR());
    });

    // отрисовка при инициализации
    renderTable();
    drawArea(getSelectedR());
});