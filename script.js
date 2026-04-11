/**
    AI-Assisted Expense Tracker | Glassmorphism Overhaul
    Premium UI, CRUD logic, Doughnut Charts, and Currency Selector.
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let expenses = [];
    let budget = 0;
    let income = 0;
    let isDarkMode = false;
    let selectedCurrency = '₹';
    let expenseChart = null;
    let filters = { from: '', to: '', category: 'All' };
    let monthlySavingsData = {};

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
    const savingsMessage = document.getElementById('savings-message');
    const budgetProgressFill = document.getElementById('budget-progress');
    const budgetMessage = document.getElementById('budget-message');
    const circleProgress = document.getElementById('circle-progress');
    const circlePercentageLabel = document.getElementById('circle-percentage');
    
    // Transactions
    const expenseListContainer = document.getElementById('expense-list');
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const filterCategory = document.getElementById('filter-category');
    const downloadCSVBtn = document.getElementById('download-csv');

    // AI Section
    const aiContent = document.getElementById('ai-content');
    const refreshAIBtn = document.getElementById('refresh-ai');

    // Modal
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editAmountLabel = document.getElementById('edit-amount-label');
    const closeModalBtns = document.querySelectorAll('.close-modal');

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
        loadState();
        initChart();
        applyTheme();
        updateLabels();
        render();
    };

    const setMaxDate = (el) => { if (el) el.max = new Date().toISOString().split('T')[0]; };

    const updateLabels = () => {
        if (amountLabel) amountLabel.textContent = `Amount (${selectedCurrency})`;
        if (editAmountLabel) editAmountLabel.textContent = `Amount (${selectedCurrency})`;
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

    // --- Persistence ---
    const loadState = () => {
        expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        budget = parseFloat(localStorage.getItem('budget')) || 0;
        income = parseFloat(localStorage.getItem('income')) || 0;
        isDarkMode = localStorage.getItem('darkMode') === 'true';
        selectedCurrency = localStorage.getItem('selectedCurrency') || '₹';
        monthlySavingsData = JSON.parse(localStorage.getItem('monthlySavingsData')) || {};
        
        if (budgetInput) budgetInput.value = budget > 0 ? budget : '';
        if (incomeInput) incomeInput.value = income > 0 ? income : '';
        if (currencySelector) currencySelector.value = selectedCurrency;
    };

    const saveState = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('budget', budget.toString());
        localStorage.setItem('income', income.toString());
        localStorage.setItem('monthlySavingsData', JSON.stringify(monthlySavingsData));
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
        const totals = categories.map(cat => data.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0));
        expenseChart.data.datasets[0].data = totals;
        expenseChart.update();
    };

    // --- Financial Calculations ---
    const updateProgressIndicators = (total) => {
        const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
        budgetProgressFill.style.width = `${percent}%`;
        budgetProgressFill.className = `progress-fill ${percent >= 100 ? 'progress-red' : 'progress-green'}`;
        budgetMessage.textContent = `${Math.round(percent)}% usage`;

        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        circleProgress.style.strokeDashoffset = offset;
        circlePercentageLabel.textContent = `${Math.round(percent)}%`;

        // Savings Calculation
        const savings = income - total;
        if (savingsMessage) {
            savingsMessage.textContent = `Savings: ${selectedCurrency}${savings.toLocaleString()}`;
            savingsMessage.style.color = savings >= 0 ? '#10b981' : '#ef4444';
        }

        // Store month-wise savings
        const now = new Date();
        const monthKey = `${now.toLocaleString('default', { month: 'long' })}-${now.getFullYear()}`;
        monthlySavingsData[monthKey] = {
            income: income,
            expense: total,
            savings: savings
        };
        saveState();
    };

    const render = () => {
        const filtered = expenses.filter(e => {
            const dateMatch = (!filters.from || e.date >= filters.from) && (!filters.to || e.date <= filters.to);
            const categoryMatch = filters.category === 'All' || e.category === filters.category;
            return dateMatch && categoryMatch;
        });

        const total = filtered.reduce((s, e) => s + e.amount, 0);
        totalAmountDisplay.textContent = `${selectedCurrency}${total.toLocaleString()}`;
        
        updateProgressIndicators(total);
        updateChart(filtered);

        expenseListContainer.innerHTML = '';
        const recent = filtered.slice(-10).reverse();

        recent.forEach(exp => {
            const row = document.createElement('tr');
            const displayCurrency = exp.currency || selectedCurrency;
            row.innerHTML = `
                <td class="amount-td">${displayCurrency}${exp.amount}</td>
                <td><span class="category-td-badge" style="background: ${categoryColors[categories.indexOf(exp.category)]}20; color: ${categoryColors[categories.indexOf(exp.category)]}; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700;">${exp.category}</span></td>
                <td style="font-size: 0.75rem; color: var(--text-muted)">${exp.date.split('-').reverse().join('/')}</td>
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
    window.deleteExpense = (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            expenses = expenses.filter(e => e.id !== id);
            saveState();
            render();
        }
    };

    window.openEditModal = (id) => {
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;
        
        document.getElementById('edit-id').value = exp.id;
        document.getElementById('edit-amount').value = exp.amount;
        document.getElementById('edit-category').value = exp.category;
        document.getElementById('edit-date').value = exp.date;
        document.getElementById('edit-currency').value = exp.currency || selectedCurrency;
        
        editModal.classList.remove('hidden');
    };

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => editModal.classList.add('hidden')));

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const amount = parseFloat(document.getElementById('edit-amount').value);
        const category = document.getElementById('edit-category').value;
        const date = document.getElementById('edit-date').value;
        const currency = document.getElementById('edit-currency').value;

        const index = expenses.findIndex(exp => exp.id === id);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], amount, category, date, currency };
            saveState();
            render();
            editModal.classList.add('hidden');
        }
    });

    // --- AI Insights ---
    const fetchAIInsights = async () => {
        if (expenses.length === 0) {
            aiContent.innerHTML = '<p class="ai-desc">Add some data to see magic insights!</p>';
            return;
        }

        aiContent.innerHTML = '<p class="ai-desc pulse">Analysing your patterns...</p>';
        
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        const activeCategories = Array.from(new Set(expenses.map(e => e.category)));
        const summary = categories.map(cat => {
            const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
            return catTotal > 0 ? `${cat}: ${catTotal}` : null;
        }).filter(x => x).join(', ');

        try {
            const response = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: summary,
                    total: total,
                    budget: budget,
                    categories: activeCategories
                })
            });

            const result = await response.json();

            if (result.success) {
                const content = result.insights;
                const points = content.split('\n')
                    .filter(p => p.trim())
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
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;
        const currency = document.getElementById('expense-currency').value;
        
        expenses.push({ id: crypto.randomUUID(), amount, category, date, note, currency });
        saveState();
        render();
        expenseForm.reset();
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => saveBtn.textContent = 'Save Expense', 2000);
    });

    budgetInput.addEventListener('input', (e) => {
        budget = parseFloat(e.target.value) || 0;
        saveState();
        render();
    });

    incomeInput.addEventListener('input', (e) => {
        income = parseFloat(e.target.value) || 0;
        saveState();
        render();
    });

    refreshAIBtn.addEventListener('click', fetchAIInsights);

    const updateFilters = () => {
        filters.from = filterFrom.value;
        filters.to = filterTo.value;
        filters.category = filterCategory.value;
        render();
    };

    filterFrom.addEventListener('change', updateFilters);
    filterTo.addEventListener('change', updateFilters);
    filterCategory.addEventListener('change', updateFilters);

    downloadCSVBtn.addEventListener('click', () => {
        const headers = ['Amount', 'Category', 'Date', 'Note'];
        const rows = expenses.map(e => [e.amount, e.category, e.date, e.note]);
        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `expenses_export_${new Date().toLocaleDateString()}.csv`;
        a.click();
    });

    init();
});
