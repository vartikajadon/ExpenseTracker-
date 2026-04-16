// --- Global Auth Handlers (Must be top-level for immediate HTML access) ---

// 1. Password Visibility Toggle
window.togglePassword = (targetId, btn) => {
    const input = document.getElementById(targetId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🔒';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    }
};

// 2. Google Login Logic initialization (Placeholder for config fetched in DOMContentLoaded)
window.googleConfig = null;
// 2. Google Login Trigger
window.triggerGoogleLogin = () => {
    console.log("[AUTH] Google Login Triggered");
    if (!window.googleConfig || !window.googleConfig.googleClientId) {
        alert("Google Sign-In is not configured. (Missing Client ID in .env)");
    } else if (typeof google === 'undefined') {
        alert("Google library is still loading. Please wait...");
    } else {
        const hiddenBtn = document.querySelector('#hidden-google-btn div[role=button]');
        if (hiddenBtn) {
            hiddenBtn.click();
        } else {
            google.accounts.id.prompt((notification) => {
                if(notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    alert("Google Sign-In prompt is blocked by your browser. Please allow third-party cookies or pop-ups.");
                }
            });
        }
    }
};

// 3. Global Settings Logic
window.toggleSettings = () => {
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
        settingsOverlay.classList.toggle('hidden');
    }
};

// 4. Login Tab Switch (Email vs Phone OTP)
window.switchLoginTab = (mode) => {
    const emailPanel = document.getElementById('email-login-panel');
    const phonePanel = document.getElementById('phone-login-panel');
    const tabEmail = document.getElementById('tab-email-login');
    const tabPhone = document.getElementById('tab-phone-login');
    if (mode === 'phone') {
        if (emailPanel) emailPanel.style.display = 'none';
        if (phonePanel) phonePanel.style.display = 'block';
        if (tabEmail) { tabEmail.style.background = 'transparent'; tabEmail.style.color = 'var(--text-muted)'; }
        if (tabPhone) { tabPhone.style.background = 'var(--primary-gradient)'; tabPhone.style.color = 'white'; }
    } else {
        if (emailPanel) emailPanel.style.display = 'block';
        if (phonePanel) phonePanel.style.display = 'none';
        if (tabEmail) { tabEmail.style.background = 'var(--primary-gradient)'; tabEmail.style.color = 'white'; }
        if (tabPhone) { tabPhone.style.background = 'transparent'; tabPhone.style.color = 'var(--text-muted)'; }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let expenses = [];
    let budget = 0;
    let income = 0;
    let isDarkMode = false;
    let selectedCurrency = '₹';
    let selectedBaseCurrency = '₹';
    let expenseChart = null;
    let filters = { from: '', to: '', category: 'All', currency: 'All', time: 'All' };
    let token = localStorage.getItem('token');
    let user = JSON.parse(localStorage.getItem('user')) || null;

    // --- Configuration ---
    const conversionRates = {
        '₹': 1,
        '$': 83,
        '€': 90,
        '£': 105
    };

    // --- DOM Elements ---
    const totalAmountDisplay = document.getElementById('total-amount');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const currencySelector = document.getElementById('currency-selector');
    
    // Form
    const expenseForm = document.getElementById('expense-form');
    const dateInput = document.getElementById('date');
    const amountLabel = document.getElementById('amount-label');
    
    // Budget & Progress
    const budgetInput = document.getElementById('monthly-budget');
    const incomeInput = document.getElementById('monthly-income');
    const incomeCurrencySelector = document.getElementById('income-currency');
    const savingsMessage = document.getElementById('savings-message');
    const budgetProgressFill = document.getElementById('budget-progress');
    const budgetMessage = document.getElementById('budget-message');
    const budgetCircle = document.getElementById('budget-circle');
    const circlePercentageLabel = document.getElementById('circle-percentage');
    
    // Transactions
    const expenseListContainer = document.getElementById('expense-list');
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const filterCategory = document.getElementById('filter-category');
    const filterCurrency = document.getElementById('filter-currency');
    const filterTime = document.getElementById('filter-time');
    const downloadCSVBtn = document.getElementById('download-csv');

    // AI Section
    const aiContent = document.getElementById('ai-content');
    const refreshAIBtn = document.getElementById('refresh-ai');

    // Modal
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editAmountLabel = document.getElementById('edit-amount-label');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // Auth Elements
    const authOverlay = document.getElementById('auth-overlay');
    const dashboardContent = document.getElementById('dashboard-content');
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    const otpSection = document.getElementById('otp-section');
    const logoutBtn = document.getElementById('logout-btn');
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    const usernameDisplay = document.getElementById('username-display');
    const topHeader = document.querySelector('.top-header');
    const landingScreen = document.getElementById('landing-screen');
    const guestBanner = document.getElementById('guest-banner');
    let isGuestMode = false;

    const openAuthModal = () => {
        if (authOverlay) {
            authOverlay.classList.remove('hidden');
            authOverlay.style.display = 'flex';
        }
        if (dashboardContent) dashboardContent.classList.add('hidden');
        if (topHeader) topHeader.style.display = 'none';
        if (guestActions) {
            guestActions.classList.add('hidden');
            guestActions.style.display = 'none';
        }
    };

    const closeAuthModal = () => {
        if (authOverlay) {
            authOverlay.classList.add('hidden');
            authOverlay.style.display = 'none';
        }
        if (dashboardContent) dashboardContent.classList.remove('hidden');
        if (topHeader) topHeader.style.display = 'block';
        if (!token && guestActions) {
            guestActions.classList.remove('hidden');
            guestActions.style.display = 'flex';
        }
    };

    // --- Configuration ---
    const categories = ["Food & Drink", "Transport", "Housing", "Health", "Entertainment", "Shopping", "Education", "Other"];
    const categoryColors = [
        '#60A5FA', '#34D399', '#FBBF24', '#F472B6', 
        '#A78BFA', '#fb923c', '#2dd4bf', '#94a3b8'
    ];

    const init = () => {
        setMaxDate(dateInput);
        setMaxDate(filterFrom);
        setMaxDate(filterTo);

        if (token) {
            // Already logged in — skip landing, go to dashboard
            if (landingScreen) landingScreen.style.display = 'none';
            closeAuthModal();
            if (userActions) userActions.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (user && usernameDisplay) usernameDisplay.textContent = user.name || "User";
            if (guestBanner) guestBanner.style.display = 'none';
            loadState();
        } else {
            // Not logged in — show landing screen
            if (landingScreen) {
                landingScreen.style.display = 'flex';
                if (dashboardContent) dashboardContent.classList.add('hidden');
                if (topHeader) topHeader.style.display = 'none';
                if (authOverlay) { authOverlay.classList.add('hidden'); authOverlay.style.display = 'none'; }
            } else {
                openAuthModal();
            }
        }

        initChart();
        applyTheme();
        updateLabels();
    };

    const setMaxDate = (el) => { if (el) el.max = new Date().toISOString().split('T')[0]; };

    const updateLabels = () => {
        if (amountLabel) amountLabel.textContent = `Amount (${selectedCurrency})`;
        if (editAmountLabel) editAmountLabel.textContent = `Amount (${selectedCurrency})`;
    };

    const convertToBase = (amount, fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return amount;
        const amountInINR = amount * conversionRates[fromCurrency];
        return amountInINR / conversionRates[toCurrency];
    };

    // --- Theme Management ---
    const applyTheme = () => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            themeIcon.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeIcon.textContent = '🌙';
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        applyTheme();
    });

    // --- Currency Handle ---
    currencySelector.addEventListener('change', (e) => {
        selectedCurrency = e.target.value;
        localStorage.setItem('selectedCurrency', selectedCurrency);
        updateLabels();
        render();
    });

    // --- Persistence (Now API Driven) ---
    const loadState = async () => {
        if (!token) return;

        try {
            // Fetch Expenses
            const expRes = await fetch('/api/expenses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const expData = await expRes.json();
            if (expData.success) expenses = expData.expenses;

            // Fetch Profile (Budget/Income)
            const profRes = await fetch('/api/expenses/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const profData = await profRes.json();
            if (profData.success) {
                budget = parseFloat(profData.profile.monthly_budget) || 0;
                income = parseFloat(profData.profile.monthly_income) || 0;
                selectedBaseCurrency = profData.profile.base_currency || '₹';
            } else if (profData.message === "Database connection failed!") {
                alert("CRITICAL: Database connection failed. Please check your .env file.");
            }

            isDarkMode = localStorage.getItem('darkMode') === 'true';
            selectedCurrency = localStorage.getItem('selectedCurrency') || '₹';

            if (budgetInput) budgetInput.value = budget > 0 ? budget : '';
            if (incomeInput) incomeInput.value = income > 0 ? income : '';
            if (incomeCurrencySelector) incomeCurrencySelector.value = selectedBaseCurrency;
            if (currencySelector) currencySelector.value = selectedCurrency;

            render();
        } catch (error) {
            console.error("Failed to load state from API", error);
            // Fallback to local if server is down (optional, but keeping it clean for now)
        }
    };

    const saveProfile = async () => {
        if (!token) return;
        await fetch('/api/expenses/profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ budget, income, base_currency: selectedBaseCurrency })
        });
    };

    // --- Analytics ---
    const initChart = () => {
        const ctx = document.getElementById('expense-chart').getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{ 
                    data: categories.map(() => 0), 
                    backgroundColor: categoryColors,
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
                    }
                }
            }
        });
    };

    const updateChart = (data) => {
        if (!expenseChart) return;
        
        const activeLabels = [];
        const activeData = [];
        const activeColors = [];
        
        categories.forEach((cat, idx) => {
            const sum = data.filter(e => e.category === cat).reduce((s, e) => s + (e.convertedAmount || parseFloat(e.amount) || 0), 0);
            if (sum > 0) {
                activeLabels.push(cat);
                activeData.push(sum);
                activeColors.push(categoryColors[idx]);
            }
        });

        expenseChart.data.labels = activeLabels;
        expenseChart.data.datasets[0].data = activeData;
        expenseChart.data.datasets[0].backgroundColor = activeColors;
        expenseChart.update();
    };

    // --- Financial Calculations ---
    const updateProgressIndicators = (total) => {
        const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
        budgetProgressFill.style.width = `${percent}%`;
        budgetProgressFill.className = `progress-fill ${percent >= 100 ? 'progress-red' : 'progress-green'}`;
        budgetMessage.textContent = `${Math.round(percent)}% usage`;

        // Update the new CSS conic-gradient circle
        if (budgetCircle) {
            budgetCircle.style.setProperty('--progress', Math.round(percent));
        }
        
        circlePercentageLabel.textContent = `${Math.round(percent)}%`;

        // Savings Calculation
        const savings = income - total;
        if (savingsMessage) {
            savingsMessage.textContent = `Savings: ${selectedBaseCurrency}${savings.toLocaleString()}`;
            savingsMessage.style.color = savings >= 0 ? '#10b981' : '#ef4444';
        }
    };

    const render = () => {
        // Enforce conversion calculation immediately on every render update
        expenses.forEach(e => {
            const baseAmount = parseFloat(e.amount) || 0;
            const fromRate = conversionRates[e.currency] || 1;
            const toRate = conversionRates[selectedBaseCurrency] || 1;
            e.convertedAmount = (baseAmount * fromRate) / toRate;
        });

        const filtered = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            const now = new Date();
            let timeMatch = true;

            if (filters.time === 'Week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                timeMatch = expenseDate >= oneWeekAgo;
            } else if (filters.time === 'Month') {
                timeMatch = expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
            } else if (filters.time === 'Year') {
                timeMatch = expenseDate.getFullYear() === now.getFullYear();
            }

            const dateMatch = (!filters.from || e.date >= filters.from) && (!filters.to || e.date <= filters.to);
            const categoryMatch = filters.category === 'All' || e.category === filters.category;
            const currencyMatch = filters.currency === 'All' || e.currency === filters.currency;
            
            return timeMatch && dateMatch && categoryMatch && currencyMatch;
        });

        // TOTAL is purely calculated based on convertedAmount (synced strictly to base currency)
        const total = filtered.reduce((s, e) => s + (e.convertedAmount || 0), 0);
        totalAmountDisplay.textContent = `${selectedBaseCurrency}${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        updateProgressIndicators(total);
        updateChart(filtered);

        expenseListContainer.innerHTML = '';
        const recent = filtered.slice(-10).reverse();

        recent.forEach(exp => {
            const row = document.createElement('tr');
            // Display using Original Values for the table list as per instructions
            const displayAmt = exp.originalAmount || exp.amount || 0;
            const displayCurr = exp.originalCurrency || exp.currency || selectedCurrency;
            
            row.innerHTML = `
                <td class="amount-td">${displayCurr}${displayAmt}</td>
                <td><span class="category-td-badge" style="background: ${categoryColors[categories.indexOf(exp.category)]}20; color: ${categoryColors[categories.indexOf(exp.category)]}; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700;">${exp.category}</span></td>
                <td style="font-size: 0.75rem; color: var(--text-muted)">${exp.date.split('T')[0].split('-').reverse().join('-')}</td>
                <td style="text-align: right;">
                    <div class="action-btns">
                        <button class="edit-btn" onclick="window.openEditModal('${exp.id}')">✏️</button>
                        <button class="delete-btn" onclick="window.deleteExpense('${exp.id}')">🗑️</button>
                    </div>
                </td>
            `;
            expenseListContainer.appendChild(row);
        });

        const emptyState = document.getElementById('empty-state');
        if (recent.length === 0) emptyState.classList.remove('hidden');
        else emptyState.classList.add('hidden');
    };

    // --- CRUD Operations ---
    window.deleteExpense = async (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                const res = await fetch(`/api/expenses/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    expenses = expenses.filter(e => e.id !== id);
                    render();
                }
            } catch (err) {
                alert("Failed to delete expense.");
            }
        }
    };

    window.openEditModal = (id) => {
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;
        
        document.getElementById('edit-id').value = exp.id;
        document.getElementById('edit-amount').value = exp.originalAmount || exp.amount || 0;
        document.getElementById('edit-category').value = exp.category;
        document.getElementById('edit-date').value = exp.date;
        document.getElementById('edit-currency').value = exp.originalCurrency || exp.currency || selectedCurrency;
        document.getElementById('edit-note').value = exp.note || '';
        
        editModal.classList.remove('hidden');
    };

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => editModal.classList.add('hidden')));

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const oAmount = parseFloat(document.getElementById('edit-amount').value);
        const category = document.getElementById('edit-category').value;
        const date = document.getElementById('edit-date').value;
        const oCurrency = document.getElementById('edit-currency').value;
        const note = document.getElementById('edit-note').value;

        try {
            const index = expenses.findIndex(exp => exp.id === id);
            if (index === -1) return;

            const updated = { 
                id,
                amount: oAmount,
                category, 
                date, 
                currency: oCurrency,
                note 
            };
                
                // Call API to update in database
                const res = await fetch(`/api/expenses/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updated)
                });

                if (res.ok) {
                    expenses[index] = updated;
                    render();
                    editModal.classList.add('hidden');
                }
        } catch (err) {
            alert("Failed to update.");
        }
    });

    // --- AI Insights ---
    const fetchAIInsights = async () => {
        if (expenses.length === 0) {
            aiContent.innerHTML = '<p class="ai-desc">Add some data to see magic insights!</p>';
            return;
        }

        aiContent.innerHTML = '<p class="ai-desc pulse">Analysing your patterns...</p>';
        
        const total = expenses.reduce((s, e) => s + (e.convertedAmount || parseFloat(e.amount) || 0), 0);
        const activeCategories = Array.from(new Set(expenses.map(e => e.category)));
        const summary = categories.map(cat => {
            const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.convertedAmount || parseFloat(e.amount) || 0), 0);
            return catTotal > 0 ? `${cat}: ${catTotal}` : null;
        }).filter(x => x).join(', ');

        try {
            const response = await fetch('/api/insights', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    totalAmount: total, 
                    categories: activeCategories,
                    summary
                })
            });
            const result = await response.json();

            if (result.success) {
                const points = result.insights.split('\n')
                    .map(p => {
                        let typeClass = '';
                        if (p.startsWith('High Alert:')) typeClass = 'insight-high';
                        else if (p.startsWith('Tip:')) typeClass = 'insight-tip';
                        else if (p.startsWith('Warning:')) typeClass = 'insight-warning';
                        return `<div class="insight-item ${typeClass}">${p.replace(/^(High Alert:|Tip:|Warning:)/, '').trim()}</div>`;
                    })
                    .join('');
                aiContent.innerHTML = points;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            aiContent.innerHTML = '<p class="ai-desc" style="color: #ef4444">Connection to AI assistant lost.</p>';
        }
    };

    // --- Event Listeners ---
    if (refreshAIBtn) refreshAIBtn.addEventListener('click', fetchAIInsights);

    const invoiceUpload = document.getElementById('invoice-upload');
    const uploadStatus = document.getElementById('upload-status');
    if (invoiceUpload) {
        invoiceUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 20 * 1024 * 1024) {
                alert("File size exceeds 20MB limit. Please upload a smaller image or PDF.");
                invoiceUpload.value = '';
                return;
            }

            if (uploadStatus) {
                uploadStatus.style.display = 'block';
                uploadStatus.textContent = 'Uploading & Analyzing Invoice via AI...';
                uploadStatus.style.color = 'var(--accent-color)';
            }

            const formData = new FormData();
            formData.append('invoice', file);

            try {
                const response = await fetch('/api/expenses/upload-invoice', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                const data = await response.json();
                if (data.success && data.data) {
                    const extracted = data.data;
                    
                    const expensePayload = {
                        id: crypto.randomUUID(),
                        amount: parseFloat(extracted.amount),
                        category: extracted.category || 'Other',
                        date: extracted.date || new Date().toISOString().split('T')[0],
                        currency: extracted.currency || selectedCurrency,
                        note: extracted.note || 'Invoice Auto-Fill'
                    };

                    const addRes = await fetch('/api/expenses', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(expensePayload)
                    });

                    if (addRes.ok) {
                        const newExpense = await addRes.json();
                        if (newExpense && newExpense.success && newExpense.expense) {
                             expenses.push(newExpense.expense);
                             render();
                        } else {
                             // Fallback manual append if API doesn't return the structured expense object properly 
                             expenses.push(expensePayload);
                             render();
                        }
                        if (uploadStatus) {
                            uploadStatus.textContent = 'Success! Expense Automatically Added.';
                            uploadStatus.style.color = '#10b981';
                        }
                    } else {
                        const errData = await addRes.json();
                        throw new Error(errData.message || "Failed saving into database.");
                    }
                } else {
                    if (uploadStatus) {
                        uploadStatus.textContent = data.message || 'Invoice text unrecognizable. Try manual entry.';
                        uploadStatus.style.color = '#ef4444';
                    }
                }
            } catch (error) {
                if (uploadStatus) {
                    uploadStatus.textContent = 'Error processing invoice block.';
                    uploadStatus.style.color = '#ef4444';
                }
                console.error("Invoice Auto-Fill Error:", error);
            }
            
            invoiceUpload.value = '';
        });
    }

    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oAmount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;
        const oCurrency = document.getElementById('expense-currency').value;
        
        const newExpense = { 
            id: crypto.randomUUID(), 
            amount: oAmount, 
            category, 
            date, 
            note,
            currency: oCurrency 
        };

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newExpense)
            });

            if (res.ok) {
                expenses.push(newExpense);
                render();
                expenseForm.reset();
                const saveBtn = document.querySelector('.save-btn');
                saveBtn.textContent = '✅ Saved!';
                setTimeout(() => saveBtn.textContent = 'Save Expense', 2000);
            }
        } catch (err) {
            alert("Error saving to database.");
        }
    });

    budgetInput.addEventListener('change', (e) => {
        budget = parseFloat(e.target.value) || 0;
        saveProfile();
        render();
    });

    incomeInput.addEventListener('change', (e) => {
        income = parseFloat(e.target.value) || 0;
        saveProfile();
        render();
    });

    incomeCurrencySelector.addEventListener('change', (e) => {
        selectedBaseCurrency = e.target.value;
        saveProfile();
        render();
    });

    // --- Auth Logic ---
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const otpForm = document.getElementById('otp-form');
    const forgotSection = document.getElementById('forgot-section');
    const resetSection = document.getElementById('reset-section');
    const settingsOverlay = document.getElementById('settings-overlay');

    const showForgotLink = document.getElementById('show-forgot');
    const forgotToLoginLink = document.getElementById('forgot-to-login');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsLogout = document.getElementById('settings-logout');
    const settingsBack = document.getElementById('settings-back');

    if (showSignup) showSignup.onclick = (e) => { 
        e.preventDefault();
        if (loginSection) loginSection.classList.add('hidden'); 
        if (signupSection) signupSection.classList.remove('hidden'); 
    };
    const showSignupFromPhone = document.getElementById('show-signup-from-phone');
    if (showSignupFromPhone) showSignupFromPhone.onclick = (e) => {
        e.preventDefault();
        if (loginSection) loginSection.classList.add('hidden');
        if (signupSection) signupSection.classList.remove('hidden');
    };
    if (showLogin) showLogin.onclick = (e) => { 
        e.preventDefault();
        if (signupSection) signupSection.classList.add('hidden'); 
        if (loginSection) loginSection.classList.remove('hidden'); 
    };

    // --- Phone OTP Login Logic ---
    let phoneOtpFullNumber = '';
    const phoneOtpSendForm = document.getElementById('phone-otp-send-form');
    const phoneOtpVerifyForm = document.getElementById('phone-otp-verify-form');

    if (phoneOtpSendForm) {
        phoneOtpSendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const cc = document.getElementById('phone-login-cc').value;
            const num = document.getElementById('phone-login-number').value.trim();
            if (!num || num.length < 10) {
                alert('Please enter a valid 10-digit phone number.');
                return;
            }
            phoneOtpFullNumber = cc + num;
            const submitBtn = phoneOtpSendForm.querySelector('.save-btn');
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('/api/auth/send-phone-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneOtpFullNumber })
                });
                const data = await res.json();
                if (data.success) {
                    phoneOtpSendForm.style.display = 'none';
                    phoneOtpVerifyForm.style.display = 'block';
                } else {
                    alert(data.message || 'Failed to send OTP.');
                }
            } catch (err) {
                alert('Network error. Please try again.');
            }
            submitBtn.textContent = 'Send OTP via SMS';
            submitBtn.disabled = false;
        });
    }

    if (phoneOtpVerifyForm) {
        phoneOtpVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('phone-otp-code').value.trim();
            if (!otp || otp.length !== 6) {
                alert('Please enter the 6-digit OTP.');
                return;
            }
            const submitBtn = phoneOtpVerifyForm.querySelector('.save-btn');
            submitBtn.textContent = 'Verifying...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('/api/auth/verify-phone-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneOtpFullNumber, otp })
                });
                const data = await res.json();
                if (data.success) {
                    token = data.token;
                    user = data.user;
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    closeAuthModal();
                    if (guestActions) { guestActions.classList.add('hidden'); guestActions.style.display = 'none'; }
                    if (userActions) { userActions.classList.remove('hidden'); userActions.style.display = 'flex'; }
                    if (logoutBtn) logoutBtn.classList.remove('hidden');
                    if (usernameDisplay) usernameDisplay.textContent = user.name || 'User';
                    loadExpenses();
                } else {
                    alert(data.message || 'Invalid OTP.');
                }
            } catch (err) {
                alert('Network error. Please try again.');
            }
            submitBtn.textContent = 'Verify & Login';
            submitBtn.disabled = false;
        });
    }


    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd);
    const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

    const showError = (elementId, message) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
        }
    };

    const clearErrors = () => {
        document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
    };

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        clearErrors();
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;
        
        let hasError = false;
        if (!identifier) {
            showError('err-login-identifier', 'Please enter a valid email or phone number.');
            hasError = true;
        }
        
        if (!hasError) {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, password })
            });
            const data = await res.json();
            if (data.success) {
                token = data.token;
                localStorage.setItem('token', token);
                user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                closeAuthModal();
                if (guestActions) {
                    guestActions.classList.add('hidden');
                    guestActions.style.display = 'none';
                }
                if (userActions) userActions.classList.remove('hidden');
                if (logoutBtn) logoutBtn.classList.remove('hidden');
                
                const usernameDisplay = document.getElementById('username-display');
                if (user && usernameDisplay) usernameDisplay.textContent = user.name || "User";
                
                loadState();
            } else {
                showError('err-login-password', data.message);
            }
        }
    };

    if (signupForm) signupForm.onsubmit = async (e) => {
        e.preventDefault();
        clearErrors();
        
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const cc = document.getElementById('signup-cc').value;
        const password = document.getElementById('signup-password').value;

        let hasError = false;
        
        if (!email && !phone) {
            showError('err-signup-email', 'Please provide either an email or a phone number.');
            hasError = true;
        }

        if (email && !validateEmail(email)) {
            showError('err-signup-email', 'Please enter a valid email address');
            hasError = true;
        }

        if (phone && !validatePhone(phone)) {
            showError('err-signup-phone', 'Phone number must be exactly 10 digits');
            hasError = true;
        }

        if (!validatePassword(password)) {
            showError('err-signup-password', 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
            hasError = true;
        }

        if (hasError) return; // Prevent submission

        const fullPhone = phone ? `${cc}${phone}` : '';
        const identifier = email || fullPhone;

        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, phone: fullPhone })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
            if (signupSection) signupSection.classList.add('hidden');
            if (otpSection) otpSection.classList.remove('hidden');
            
            // Store phone explicitly on the html logic for the submit step
            document.getElementById('signup-phone').dataset.fullPhone = fullPhone;
        } else {
            if (data.message === 'This email is already registered') {
                showError('err-signup-email', 'This email is already registered');
            } else {
                showError('err-signup-password', data.message);
            }
        }
    };

    if (otpForm) otpForm.onsubmit = async (e) => {
        e.preventDefault();
        clearErrors();
        const nameEl = document.getElementById('signup-name');
        const emailEl = document.getElementById('signup-email');
        const passwordEl = document.getElementById('signup-password');
        const phoneEl = document.getElementById('signup-phone');
        const otpEl = document.getElementById('otp-code');

        const name = nameEl ? nameEl.value : '';
        const email = emailEl ? emailEl.value : '';
        const password = passwordEl ? passwordEl.value : '';
        const phone = phoneEl && phoneEl.dataset.fullPhone ? phoneEl.dataset.fullPhone : '';
        const otp = otpEl ? otpEl.value : '';

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, otp })
        });
        const data = await res.json();
        if (data.success) {
            token = data.token;
            if (data.user) {
                user = data.user;
                localStorage.setItem('user', JSON.stringify(user));
            }
            if (authOverlay) {
                closeAuthModal();
                if (guestActions) {
                    guestActions.classList.add('hidden');
                    guestActions.style.display = 'none';
                }
                if (userActions) userActions.classList.remove('hidden');
                if (logoutBtn) logoutBtn.classList.remove('hidden');
                
                const usernameDisplay = document.getElementById('username-display');
                if (user && usernameDisplay) usernameDisplay.textContent = user.name || name || "User";
            }
            loadState();
        } else alert(data.message);
    };

    // --- Unified Auth Logic & Global initialization ---

    const initGoogleAuth = async () => {
        try {
            const configRes = await fetch('/api/config');
            window.googleConfig = await configRes.json();
            
            const pollInterval = setInterval(() => {
                if (typeof google !== 'undefined' && google.accounts) {
                    clearInterval(pollInterval);
                    google.accounts.id.initialize({
                        client_id: window.googleConfig.googleClientId || "missing-id",
                        callback: handleGoogleLogin
                    });
                    
                    const hiddenDiv = document.createElement('div');
                    hiddenDiv.id = 'hidden-google-btn';
                    hiddenDiv.style.display = 'none';
                    document.body.appendChild(hiddenDiv);
                    google.accounts.id.renderButton(hiddenDiv, { type: 'standard' });
                }
            }, 500);
            setTimeout(() => clearInterval(pollInterval), 10000);
        } catch (err) {
            console.error("Auth config loading failed:", err);
        }
    };
    initGoogleAuth();

    // 3. Navigation logic with defensive checks
    if (showForgotLink) showForgotLink.onclick = (e) => { 
        e.preventDefault();
        if (loginSection) loginSection.classList.add('hidden'); 
        if (forgotSection) forgotSection.classList.remove('hidden'); 
    };
    
    if (forgotToLoginLink) forgotToLoginLink.onclick = (e) => { 
        e.preventDefault();
        if (forgotSection) forgotSection.classList.add('hidden'); 
        if (loginSection) loginSection.classList.remove('hidden'); 
    };
    
    
    const authBackBtn = document.getElementById('auth-back-btn');
    if (authBackBtn) {
        authBackBtn.onclick = (e) => {
            e.preventDefault();
            closeAuthModal();
        };
    }
    
    // Header Login/Signup Buttons (Call-to-Action)
    const headerLoginBtn = document.getElementById('header-login-btn');
    const headerSignupBtn = document.getElementById('header-signup-btn');

    if (headerLoginBtn) headerLoginBtn.onclick = () => {
        if (signupSection) signupSection.classList.add('hidden');
        if (loginSection) loginSection.classList.remove('hidden');
        openAuthModal();
    };

    if (headerSignupBtn) headerSignupBtn.onclick = () => {
        if (loginSection) loginSection.classList.add('hidden');
        if (signupSection) signupSection.classList.remove('hidden');
        openAuthModal();
    };

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        };
    }

    // Forgot Password Flow
    if (forgotForm) forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email');
        const identifier = emailInput ? emailInput.value : '';
        
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: identifier })
        });
        const data = await res.json();
        if (data.success) {
            if (forgotSection) forgotSection.classList.add('hidden');
            if (resetSection) resetSection.classList.remove('hidden');
            alert(data.message);
        } else alert(data.message);
    };

    if (resetForm) resetForm.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email');
        const email = emailInput ? emailInput.value : '';
        const otp = document.getElementById('reset-otp').value;
        const newPassword = document.getElementById('new-password').value;

        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            if (resetSection) resetSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
            alert("Password updated successfully!");
        } else alert(data.message);
    };

    // --- Google Sign-In backend callback ---
    const handleGoogleLogin = async (response) => {
        const id_token = response.credential;
        try {
            const res = await fetch('/api/auth/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token })
            });
            const data = await res.json();
            if (data.success) {
                token = data.token;
                user = data.user;
                localStorage.setItem('user', JSON.stringify(user));
                closeAuthModal();
                if (guestActions) {
                    guestActions.classList.add('hidden');
                    guestActions.style.display = 'none';
                }
                if (userActions) userActions.classList.remove('hidden');
                if (logoutBtn) logoutBtn.classList.remove('hidden');
                
                const usernameDisplay = document.getElementById('username-display');
                if (user && usernameDisplay) usernameDisplay.textContent = user.name || "User";
                
                loadState();
            } else alert(data.message);
        } catch (err) {
            console.error("Google Auth Fetch Error", err);
            alert("Google Sign-In backend error: " + err.message);
        }
    };

    const updateFilters = () => {
        filters.from = filterFrom.value;
        filters.to = filterTo.value;
        filters.category = filterCategory.value;
        filters.currency = filterCurrency.value;
        filters.time = filterTime.value;
        render();
    };

    filterFrom.addEventListener('change', updateFilters);
    filterTo.addEventListener('change', updateFilters);
    filterCategory.addEventListener('change', updateFilters);
    filterCurrency.addEventListener('change', updateFilters);
    filterTime.addEventListener('change', updateFilters);

    downloadCSVBtn.addEventListener('click', () => {
        const currencyNames = { '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
        const headers = ['Date', 'Category', 'Amount', 'Currency', 'Note'];
        const rows = expenses.map(e => [
            `"${e.date ? e.date.split('T')[0] : ''}"`,
            `"${e.category}"`,
            parseFloat(e.amount) || 0,
            currencyNames[e.currency] || e.currency,
            `"${(e.note || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `SpendMate_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });

    logoutBtn.onclick = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    };

    // Google Login button was handled in initGoogleAuth()

    // --- Edit Profile Modal Logic ---
    const profileModal = document.getElementById('profile-modal');
    const profileTrigger = document.getElementById('profile-trigger');
    const profileCloseBtn = document.getElementById('profile-close-btn');
    const profileCancelBtn = document.getElementById('profile-cancel-btn');
    const profileForm = document.getElementById('profile-form');
    const profileMsg = document.getElementById('profile-msg');

    const openProfileModal = async () => {
        if (!token || !profileModal) return;
        profileModal.style.display = 'flex';
        profileMsg.style.display = 'none';
        document.getElementById('profile-current-password').value = '';
        document.getElementById('profile-new-password').value = '';

        try {
            const res = await fetch('/api/auth/user-profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('profile-name').value = data.user.name || '';
                document.getElementById('profile-email').value = data.user.email || '';
                document.getElementById('profile-phone').value = data.user.phone || '';
                document.getElementById('profile-user-email').textContent = data.user.email || '';
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    };

    const closeProfileModal = () => {
        if (profileModal) profileModal.style.display = 'none';
    };

    if (profileTrigger) profileTrigger.addEventListener('click', openProfileModal);
    if (profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfileModal);
    if (profileCancelBtn) profileCancelBtn.addEventListener('click', closeProfileModal);
    if (profileModal) profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
    });

    if (profileForm) profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();
        const currentPassword = document.getElementById('profile-current-password').value;
        const newPassword = document.getElementById('profile-new-password').value;

        if (!currentPassword) {
            profileMsg.textContent = '🔒 Current password is required to save changes.';
            profileMsg.style.color = '#ef4444';
            profileMsg.style.display = 'block';
            return;
        }

        const submitBtn = profileForm.querySelector('.save-btn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, name, email, phone, newPassword: newPassword || undefined })
            });
            const data = await res.json();

            if (data.success) {
                profileMsg.textContent = '✅ ' + data.message;
                profileMsg.style.color = '#22c55e';
                profileMsg.style.display = 'block';

                // Update local state
                token = data.token;
                user = data.user;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                if (usernameDisplay) usernameDisplay.textContent = user.name || 'User';

                setTimeout(closeProfileModal, 1500);
            } else {
                profileMsg.textContent = '❌ ' + data.message;
                profileMsg.style.color = '#ef4444';
                profileMsg.style.display = 'block';
            }
        } catch (err) {
            profileMsg.textContent = '❌ Network error. Please try again.';
            profileMsg.style.color = '#ef4444';
            profileMsg.style.display = 'block';
        }
        submitBtn.textContent = 'Save Changes';
        submitBtn.disabled = false;
    });

    // --- Landing Screen Logic ---
    const backToLanding = document.getElementById('auth-back-to-landing');
    if (backToLanding) backToLanding.addEventListener('click', () => {
        if (authOverlay) { authOverlay.classList.add('hidden'); authOverlay.style.display = 'none'; }
        if (dashboardContent) dashboardContent.classList.add('hidden');
        if (topHeader) topHeader.style.display = 'none';
        if (landingScreen) { landingScreen.style.display = 'flex'; landingScreen.style.opacity = '1'; }
    });

    const dismissLanding = () => {
        if (landingScreen) {
            landingScreen.style.opacity = '0';
            setTimeout(() => { landingScreen.style.display = 'none'; }, 500);
        }
    };

    const landingGetStarted = document.getElementById('landing-get-started');
    const landingLogin = document.getElementById('landing-login');
    const landingSignup = document.getElementById('landing-signup');
    const landingGuest = document.getElementById('landing-guest');
    const guestBannerLogin = document.getElementById('guest-banner-login');

    if (landingGetStarted) landingGetStarted.addEventListener('click', () => {
        dismissLanding();
        if (signupSection) signupSection.classList.remove('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        openAuthModal();
    });

    if (landingLogin) landingLogin.addEventListener('click', () => {
        dismissLanding();
        if (loginSection) loginSection.classList.remove('hidden');
        if (signupSection) signupSection.classList.add('hidden');
        openAuthModal();
    });

    if (landingSignup) landingSignup.addEventListener('click', () => {
        dismissLanding();
        if (signupSection) signupSection.classList.remove('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        openAuthModal();
    });

    if (landingGuest) landingGuest.addEventListener('click', () => {
        dismissLanding();
        isGuestMode = true;
        // Show dashboard in guest mode
        if (dashboardContent) dashboardContent.classList.remove('hidden');
        if (topHeader) topHeader.style.display = 'block';
        if (authOverlay) { authOverlay.classList.add('hidden'); authOverlay.style.display = 'none'; }
        if (guestActions) { guestActions.classList.remove('hidden'); guestActions.style.display = 'flex'; }
        if (guestBanner) guestBanner.style.display = 'block';
        render();
    });

    if (guestBannerLogin) guestBannerLogin.addEventListener('click', () => {
        isGuestMode = false;
        if (guestBanner) guestBanner.style.display = 'none';
        if (loginSection) loginSection.classList.remove('hidden');
        if (signupSection) signupSection.classList.add('hidden');
        openAuthModal();
    });

    init();
});
