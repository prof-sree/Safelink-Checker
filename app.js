// DOM Elements
const elements = {
    messageInput: document.getElementById('message-input'),
    analyzeBtn: document.getElementById('analyze-btn'),
    loadingState: document.getElementById('loading-state'),
    resultCard: document.getElementById('result-card'),
    resultContainer: document.getElementById('result-container'),
    verdictIcon: document.getElementById('verdict-icon'),
    verdictText: document.getElementById('verdict-text'),
    confidenceBadge: document.getElementById('confidence-badge'),
    explanationText: document.getElementById('explanation-text'),
    tamilSummary: document.getElementById('tamil-summary'),
    tipsList: document.getElementById('tips-list'),
    copyTipsBtn: document.getElementById('copy-tips-btn')
};

// Global State
let API_KEY = "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";

// Event Listeners
elements.analyzeBtn.addEventListener('click', handleAnalysis);
elements.copyTipsBtn.addEventListener('click', copyTipsToClipboard);

async function handleAnalysis() {
    const message = elements.messageInput.value.trim();

    if (!message) {
        alert("Please paste a message to analyze.");
        return;
    }

    if (!API_KEY) {
        alert("Please provide your Groq API key first.");
        elements.apiKeyInput.focus();
        return;
    }

    // Reset UI state
    hideResult();
    showLoading(true);

    try {
        const resultJSON = await callGroqAPI(message);
        renderResult(resultJSON);
    } catch (error) {
        console.error("Analysis Error:", error);
        alert(`Analysis failed: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function callGroqAPI(userMessage) {
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const systemPrompt = `You are SafeLink Checker, an expert Indian cyber safety AI specializing in WhatsApp and Facebook scams targeting users in India (especially women). Be empathetic, direct, and accurate. Focus on 2025-2026 trends: fake UPI/refunds/COD, family emergency money requests, malicious greetings/invitations (New Year, wedding cards), investment/job/lottery offers, urgent account verification, GhostPairing/Linked Devices hijacks, WhatsApp Web renting ads, fake SBI/Amazon/Flipkart alerts, OTP sharing, malware APK downloads.

Analyze ONLY the provided message. Respond EXCLUSIVELY in valid JSON format. No extra text.`;

    const dynamicPrompt = `Analyze this message: """${userMessage}"""

Output JSON only:
{
  "verdict": "Safe" | "Suspicious" | "High Risk Phishing",
  "confidence": "High" | "Medium" | "Low",
  "explanation": "2-4 sentence clear English explanation of why, mentioning specific red flags",
  "tamil_summary": "Short Tamil verdict + key reason (use simple Tamil)",
  "tips": ["Tip 1 in English", "Tip 2 in English", "Tip 3 in English"]
}
If clearly legitimate (no red flags), output "Safe". Be strict on urgency, unknown links, OTP requests.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: dynamicPrompt }
            ],
            temperature: 0.1, // low temperature for more deterministic/strict parsing
            response_format: { type: "json_object" } // Force JSON mode
        }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
        return JSON.parse(content);
    } catch (parseError) {
        throw new Error("Received malformed JSON from API.");
    }
}

function renderResult(data) {
    // Deconstruct with defaults
    const {
        verdict = "Unknown",
        confidence = "Medium",
        explanation = "Unable to provide detailed explanation.",
        tamil_summary = "பகுப்பாய்வு செய்ய முடியவில்லை.",
        tips = []
    } = data;

    // Reset classes
    elements.resultContainer.className = "rounded-2xl shadow-sm border p-5 overflow-hidden relative transition-colors";
    elements.verdictIcon.className = "w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0";
    elements.confidenceBadge.className = "px-2 py-0.5 mt-1 text-[10px] font-bold uppercase rounded-full border";

    // Style based on Verdict
    switch (verdict.toLowerCase().trim()) {
        case 'safe':
            // Green theme
            elements.resultContainer.classList.add('bg-green-50', 'border-green-200');
            elements.verdictIcon.classList.add('bg-green-200', 'text-green-700');
            elements.verdictIcon.innerHTML = `<i class="fa-solid fa-check"></i>`;
            elements.verdictText.className = "text-2xl font-bold text-green-700";
            triggerConfetti();
            break;

        case 'suspicious':
            // Orange Theme
            elements.resultContainer.classList.add('bg-orange-50', 'border-orange-200');
            elements.verdictIcon.classList.add('bg-orange-200', 'text-orange-700');
            elements.verdictIcon.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
            elements.verdictText.className = "text-2xl font-bold text-orange-700";
            break;

        case 'high risk phishing':
            // Red Theme
            elements.resultContainer.classList.add('bg-red-50', 'border-red-200');
            elements.verdictIcon.classList.add('bg-red-200', 'text-red-700');
            elements.verdictIcon.innerHTML = `<i class="fa-solid fa-skull-crossbones"></i>`;
            elements.verdictText.className = "text-2xl font-bold text-red-700";
            // Add pulse effect to highlight danger
            elements.resultContainer.classList.add('animate-pulse-slow');
            break;

        default:
            elements.resultContainer.classList.add('bg-slate-50', 'border-slate-200');
            elements.verdictIcon.classList.add('bg-slate-200', 'text-slate-700');
            elements.verdictIcon.innerHTML = `<i class="fa-solid fa-circle-question"></i>`;
            elements.verdictText.className = "text-2xl font-bold text-slate-700";
    }

    // Confidence Badge
    elements.confidenceBadge.textContent = `${confidence} Confidence`;
    if (confidence.toLowerCase() === 'high') {
        elements.confidenceBadge.classList.add('bg-green-100', 'text-green-800', 'border-green-200');
    } else if (confidence.toLowerCase() === 'medium') {
        elements.confidenceBadge.classList.add('bg-orange-100', 'text-orange-800', 'border-orange-200');
    } else {
        elements.confidenceBadge.classList.add('bg-slate-100', 'text-slate-800', 'border-slate-200');
    }

    // Populate Fields
    elements.verdictText.textContent = verdict;
    elements.explanationText.textContent = explanation;
    elements.tamilSummary.textContent = tamil_summary;

    // Populate Tips
    elements.tipsList.innerHTML = '';
    if (tips && Array.isArray(tips) && tips.length > 0) {
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.className = "text-sm text-slate-700 bg-white p-2.5 rounded border border-slate-100 shadow-sm flex items-start gap-2";
            li.innerHTML = `<i class="fa-solid fa-check text-green-500 mt-0.5"></i> <span>${tip}</span>`;
            elements.tipsList.appendChild(li);
        });
    } else {
        elements.tipsList.innerHTML = `<li class="text-sm text-slate-500 italic">No specific tips provided.</li>`;
    }

    // Show Card with animation
    elements.resultCard.classList.remove('hidden');
    // slight delay to allow display:block to apply before animating opacity
    setTimeout(() => {
        elements.resultCard.classList.remove('opacity-0', 'translate-y-4');
        elements.resultCard.classList.add('opacity-100', 'translate-y-0');

        // Scroll to result
        elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

function hideResult() {
    elements.resultCard.classList.add('opacity-0', 'translate-y-4');
    elements.resultCard.classList.remove('opacity-100', 'translate-y-0');
    setTimeout(() => {
        elements.resultCard.classList.add('hidden');
    }, 500); // match transition duration
}

function showLoading(show) {
    if (show) {
        elements.loadingState.classList.remove('hidden');
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.classList.add('opacity-70', 'cursor-not-allowed');
        elements.analyzeBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Analyzing...</span>`;
    } else {
        elements.loadingState.classList.add('hidden');
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        elements.analyzeBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span>Analyze Message</span>`;
    }
}

function copyTipsToClipboard() {
    const tips = Array.from(elements.tipsList.querySelectorAll('li span')).map(span => "- " + span.textContent).join('\n');
    if (!tips) return;

    const copyText = `SafeLink Checker Advice:\n${tips}`;

    navigator.clipboard.writeText(copyText).then(() => {
        const originalText = elements.copyTipsBtn.innerHTML;
        elements.copyTipsBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        elements.copyTipsBtn.classList.add('text-green-600');

        setTimeout(() => {
            elements.copyTipsBtn.innerHTML = originalText;
            elements.copyTipsBtn.classList.remove('text-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }
}
