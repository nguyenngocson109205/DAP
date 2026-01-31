/* =========================================
   PHẦN 1: CHATBOT LOGIC
   ========================================= */
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        document.getElementById('userInput').focus();
    } else {
        chatWindow.style.display = 'none';
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const message = inputField.value.trim();
    const chatBox = document.getElementById('chatMessages');

    if (message === "") return;

    chatBox.innerHTML += `<div class="message user">${message}</div>`;
    inputField.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div class="message bot" id="${loadingId}">...</div>`;

    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();
        document.getElementById(loadingId).remove();

        if (data.reply) {
            chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot text-danger">Lỗi format server</div>`;
        }
    } catch (error) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="message bot text-danger">Mất kết nối server!</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================================
   PHẦN 2: AI FORECAST LOGIC (ĐÃ KẾT NỐI API THẬT)
   ========================================= */

let predictionChartInstance = null;

// Hàm chạy dự báo (Gọi API Python)
async function runPrediction() {
    const modelSelect = document.getElementById('modelSelect');
    const modelType = modelSelect ? modelSelect.value : 'gru';

    // 1. Hiển thị trạng thái đang tải
    const trendEl = document.getElementById('predTrend');
    if (trendEl) {
        trendEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tính toán...';
        trendEl.className = "badge bg-warning text-dark px-3 py-2 rounded-pill";
    }

    try {
        // 2. GỌI API BACKEND (Cái mà bạn vừa viết xong)
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelType })
        });

        const data = await response.json();

        if (data.error) {
            alert("Lỗi từ Server: " + data.error);
            return;
        }

        // 3. LẤY DỮ LIỆU THẬT TỪ AI
        const predictedData = data.prediction; // Mảng 24 số thực
        const labels = Array.from({ length: 24 }, (_, i) => `${i + 1}h`);

        // 4. CẬP NHẬT GIAO DIỆN
        const maxVal = Math.max(...predictedData);
        const minVal = Math.min(...predictedData);

        document.getElementById('predMax').innerText = `$${maxVal.toFixed(1)}K`;
        document.getElementById('predMin').innerText = `$${minVal.toFixed(1)}K`;

        // Logic xu hướng (So sánh giờ cuối vs giờ đầu)
        if (predictedData[predictedData.length - 1] > predictedData[0]) {
            trendEl.innerHTML = '<i class="bi bi-arrow-up-right"></i> Đang tăng';
            trendEl.className = "badge badge-trend-up px-3 py-2 rounded-pill";
        } else {
            trendEl.innerHTML = '<i class="bi bi-arrow-down-right"></i> Đang giảm';
            trendEl.className = "badge badge-trend-down px-3 py-2 rounded-pill";
        }

        // 5. VẼ BIỂU ĐỒ
        const ctx = document.getElementById('predictionChart');
        if (predictionChartInstance) {
            predictionChartInstance.destroy();
        }

        predictionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Dự báo (${modelType.toUpperCase()})`,
                        data: predictedData,
                        borderColor: '#6610f2',
                        backgroundColor: 'rgba(102, 16, 242, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4
                    },
                    {
                        label: 'Thực tế (Tham chiếu)',
                        // Tạo đường tham chiếu giả định để so sánh cho đẹp
                        data: predictedData.map(x => x * (0.9 + Math.random() * 0.2)),
                        borderColor: '#adb5bd',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });

    } catch (error) {
        console.error("Lỗi:", error);
        if (trendEl) {
            trendEl.innerHTML = '❌ Mất kết nối';
            trendEl.className = "badge bg-danger text-white px-3 py-2 rounded-pill";
        }
        alert("Không kết nối được với Server Python! Hãy chắc chắn bạn đã chạy 'python run.py'");
    }
}

// Chạy lần đầu khi load trang
document.addEventListener('DOMContentLoaded', function () {
    runPrediction();
});