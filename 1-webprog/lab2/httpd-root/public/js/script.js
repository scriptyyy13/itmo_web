document.addEventListener("DOMContentLoaded", () => {
    const SERVER_URL = "/fcgi-bin/app.jar";

    const canvas = document.getElementById("graph");
    const ctx = canvas ? canvas.getContext("2d") : null;
    
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 120;

    let pointsHistory = [];
    try {
        pointsHistory = JSON.parse(localStorage.getItem("lab2_points")) || [];
    } catch (e) {
        pointsHistory = [];
    }

    let timeOffset = 0; // разница часов сервера и клиента

    // если вдруг не загрузилась картинка
    const bgImage = new Image();
    bgImage.onload = () => {
        drawArea(getSelectedR());
    };
    bgImage.onerror = () => {
        // если картинка не загрузилась локально, все равно рисуем график
        drawArea(getSelectedR());
    };
    bgImage.src = "img/cat.png";

    document.querySelectorAll('input[name="r"]').forEach(radio => {
        radio.addEventListener("change", () => {
            drawArea(getSelectedR());
        });
    });

    // показать/скрыть ошибку сервера
    function showServerError(msg) {
        const errBanner = document.getElementById("server-error-banner");
        if (!errBanner) return;
        if (msg) {
            errBanner.textContent = msg;
            errBanner.style.display = "block";
        } else {
            errBanner.style.display = "none";
            errBanner.textContent = "";
        }
    }

    function getSelectedR() {
        const checked = document.querySelector('input[name="r"]:checked');
        return checked ? parseFloat(checked.value) : 3;
    }

    function getSelectedY() {
        const checkboxes = document.querySelectorAll('input[name="y"]:checked');
        return Array.from(checkboxes).map(cb => parseFloat(cb.value));
    }

    // отрисовка графика
    function drawArea(r) {
        ctx.clearRect(0, 0, width, height);

        // фон с котом
        try {
            if (bgImage.complete && bgImage.naturalWidth !== 0) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.drawImage(bgImage, 0, 0, width, height);
                ctx.restore();
            }
        } catch (e) {
            // игнорим ужасы
        }

        if (r && r > 0) {
            const unit = scale / r;

            ctx.fillStyle = "rgba(113, 128, 150, 0.4)";
            ctx.strokeStyle = "#4a5568";
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            // фигура
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, (r / 2) * unit, -Math.PI / 2, 0, false);
            ctx.lineTo(centerX + (r / 2) * unit, centerY + r * unit);
            ctx.lineTo(centerX, centerY + r * unit);
            ctx.lineTo(centerX - r * unit, centerY);

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // оси
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = "#2d3748";
        ctx.font = "11px Arial";

        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(width - 10, centerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width - 10, centerY);
        ctx.lineTo(width - 16, centerY - 4);
        ctx.lineTo(width - 16, centerY + 4);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX, height - 10);
        ctx.lineTo(centerX, 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX, 10);
        ctx.lineTo(centerX - 4, 16);
        ctx.lineTo(centerX + 4, 16);
        ctx.fill();

        ctx.fillText("x", width - 12, centerY - 8);
        ctx.fillText("y", centerX + 8, 14);

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

        [centerX - scale, centerX - scale / 2, centerX + scale / 2, centerX + scale].forEach(xPx => {
            ctx.beginPath();
            ctx.moveTo(xPx, centerY - 3);
            ctx.lineTo(xPx, centerY + 3);
            ctx.stroke();
        });

        [centerY - scale, centerY - scale / 2, centerY + scale / 2, centerY + scale].forEach(yPx => {
            ctx.beginPath();
            ctx.moveTo(centerX - 3, yPx);
            ctx.lineTo(centerX + 3, yPx);
            ctx.stroke();
        });

        labels.forEach(l => ctx.fillText(l.text, l.x, l.y));

        // точки из истории
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

    // валидация
    function validateForm() {
        let isValid = true;

        const xInput = document.getElementById("x-input").value.trim().replace(',', '.');
        const xErr = document.getElementById("x-error");
        const xNum = parseFloat(xInput);

        if (xInput === "" || isNaN(xNum) || xNum < -5 || xNum > 3) {
            if (xErr) xErr.style.display = "block";
            isValid = false;
        } else {
            if (xErr) xErr.style.display = "none";
        }

        const selectedY = getSelectedY();
        const yErr = document.getElementById("y-error");
        if (selectedY.length < 1) {
            if (yErr) yErr.style.display = "block";
            isValid = false;
        } else {
            if (yErr) yErr.style.display = "none";
        }

        const selectedR = getSelectedR();
        const rErr = document.getElementById("r-error");
        if (!selectedR) {
            if (rErr) rErr.style.display = "block";
            isValid = false;
        } else {
            if (rErr) rErr.style.display = "none";
        }

        return isValid ? { x: xNum, y: selectedY, r: selectedR } : null;
    }

    // обновить таблицу
    function renderTable() {
        const tbody = document.getElementById("results-body");
        if (!tbody) return;
        tbody.innerHTML = "";

        pointsHistory.slice().reverse().forEach(pt => {
            const tr = document.createElement("tr");
            const hitClass = pt.hit ? "hit-true" : "hit-false";
            const hitText = pt.hit ? "Есть пробитие" : "Промазал";

            tr.innerHTML = `
                <td>${pt.x}</td>
                <td>${pt.y}</td>
                <td>${pt.r}</td>
                <td class="${hitClass}">${hitText}</td>
                <td>${pt.currentTime}</td>
                <td>${pt.executionTime}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // подсчет времени от/до сервера
    function updateServerTimeDiff() {
        const stateEl = document.getElementById("server-state");
        const toEl = document.getElementById("time-to-server");
        const fromEl = document.getElementById("time-from-server");
        const totalpingEm = document.getElementById("time-tofrom-server");

        // если superagent не подгрузился или работаем без сервера
        if (typeof superagent === "undefined") {
            if (stateEl) {
                stateEl.textContent = "Недоступен";
                stateEl.className = "state-offline";
            }
            return;
        }

        const t1 = Date.now();

        // синхронизация времени
        superagent
            .get(SERVER_URL)
            .query({ action: "getServerUnixTime" })
            .timeout(2000)
            .end((err, res) => {
                if (err || !res || !res.ok) {
                    if (stateEl) {
                        stateEl.textContent = "Недоступен";
                        stateEl.className = "state-offline";
                    }
                    if (toEl) toEl.textContent = "--";
                    if (fromEl) fromEl.textContent = "--";
                    if (totalpingEm) totalpingEm.textContent = "--";
                    return;
                }

                const t2 = Date.now();
                const serverTime = res.body.serverUnixTime;
                
                timeOffset = serverTime - (t1 + (t2 - t1) / 2);

                // расчет времени обратно
                const clientSendTime = Date.now();

                superagent
                    .get(SERVER_URL)
                    .query({ action: "getServerUnixTime" })
                    .timeout(2000)
                    .end((err2, res2) => {
                        if (err2 || !res2 || !res2.ok) return;

                        const clientReceiveTime = Date.now();
                        const serverReceiveTime = res2.body.serverUnixTime;

                        const adjustedSendTime = clientSendTime + timeOffset;
                        const adjustedReceiveTime = clientReceiveTime + timeOffset;

                        let timeTo = Math.max(0, serverReceiveTime - adjustedSendTime);
                        let timeFrom = Math.max(0, adjustedReceiveTime - serverReceiveTime);
                        let totaltime = timeTo + timeFrom;

                        if (stateEl) {
                            stateEl.textContent = "Доступен";
                            stateEl.className = "state-online";
                        }
                        if (toEl) toEl.textContent = timeTo.toFixed(1);
                        if (fromEl) fromEl.textContent = timeFrom.toFixed(1);
                        if (totalpingEm) totalpingEm.textContent = totaltime.toFixed(1);
                    });
            });
    }

    // отправка формы
    const formEl = document.getElementById("point-form");
    if (formEl) {
        formEl.addEventListener("submit", (e) => {
            e.preventDefault();
            showServerError(null);

            const validData = validateForm();
            if (!validData) return;

            const queryParams = new URLSearchParams();
            queryParams.append("x", validData.x);
            validData.y.forEach(yVal => queryParams.append("y", yVal));
            queryParams.append("r", validData.r);

            if (typeof superagent === "undefined") {
                showServerError("superagent не загружен");
                return;
            }

            superagent
                .get(SERVER_URL)
                .query(queryParams.toString())
                .timeout(2000)
                .end((err, res) => {
                    if (err || !res || !res.ok) {
                        showServerError("Ошибка подключения к сервлету (" + (err ? err.status || 'Недоступен' : res ? res.status : 'Error') + ")");
                        return;
                    }

                    const responseData = res.body;

                    if (Array.isArray(responseData)) {
                        responseData.forEach(item => pointsHistory.push(item));
                        try {
                            localStorage.setItem("lab2_points", JSON.stringify(pointsHistory));
                        } catch (e) {}
                        renderTable();
                        drawArea(validData.r);
                        updateServerTimeDiff();
                    } else if (responseData && responseData.error) {
                        showServerError("Сервер вернул ошибку: " + responseData.error);
                    }
                });
        });
    }

    // очистить историю
    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            pointsHistory = [];
            try {
                localStorage.removeItem("lab2_points");
            } catch (e) {}
            renderTable();
            drawArea(getSelectedR());
        });
    }

    // первоначальный рендер
    renderTable();
    drawArea(getSelectedR());
    
    updateServerTimeDiff();
    setInterval(updateServerTimeDiff, 1000);
});