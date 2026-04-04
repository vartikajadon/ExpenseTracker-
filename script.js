/**
    AI-Assisted Expense Tracker | Mobile-First Logic
    Updates for Circular Progress, Theme Toggle, and New UI Components
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let expenses = [];
    let budget = 0;
    let isDarkMode = false;
    let expenseChart = null;
    let filters = { from: '', to: '', category: 'All' };

    // --- DOM Elements ---
    const totalAmountDisplay = document.getElementById('total-amount');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Form
    const expenseForm = document.getElementById('expense-form');
    const splitToggle = document.getElementById('split-toggle');
    const dateInput = document.getElementById('date');
    
    // Budget & Progress
    const budgetInput = document.getElementById('monthly-budget');
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
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // --- Configuration ---
    const categories = ["Food & Drink", "Transport", "Housing", "Health", "Entertainment", "Shopping", "Education", "Other"];
    const categoryColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    const init = () => {
        setMaxDate(dateInput);
        setMaxDate(filterFrom);
        setMaxDate(filterTo);
        loadState();
        initChart();
        render();
        applyTheme();
    };

    const setMaxDate = (el) => { if (el) el.max = new Date().toISOString().split('T')[0]; };

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

    // --- Persistence ---
    const loadState = () => {
        expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        budget = parseFloat(localStorage.getItem('budget')) || 0;
        isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (budgetInput) budgetInput.value = budget > 0 ? budget : '';
    };

    const saveState = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('budget', budget.toString());
    };

    // --- Analytics ---
    const initChart = () => {
        const ctx = document.getElementById('expense-chart').getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories.map(c => c.split(' ')[0]), // Short labels for mobile
                datasets: [{ 
                    data: categories.map(() => 0), 
                    backgroundColor: categoryColors,
                    borderRadius: 8,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { display: false }, ticks: { display: false } },
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
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
        // Linear Progress Bar
        const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
        budgetProgressFill.style.width = `${percent}%`;
        budgetProgressFill.className = `progress-fill ${percent >= 100 ? 'progress-red' : 'progress-green'}`;
        budgetMessage.textContent = `${Math.round(percent)}% usage`;

        // Circular Indicator
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        circleProgress.style.strokeDashoffset = offset;
        circlePercentageLabel.textContent = `${Math.round(percent)}%`;
    };

    const render = () => {
        const filtered = expenses.filter(e => {
            const dateMatch = (!filters.from || e.date >= filters.from) && (!filters.to || e.date <= filters.to);
            const categoryMatch = filters.category === 'All' || e.category === filters.category;
            return dateMatch && categoryMatch;
        });

        const total = filtered.reduce((s, e) => s + e.amount, 0);
        totalAmountDisplay.textContent = `₹${total.toLocaleString()}`;
        
        updateProgressIndicators(total);
        updateChart(filtered);

        expenseListContainer.innerHTML = '';
        const recent = filtered.slice(-5).reverse(); // Show last 5 on mobile

        recent.forEach(exp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="amount-td">₹${exp.amount}</td>
                <td><span class="category-td-badge">${exp.category}</span></td>
                <td style="font-size: 0.75rem; color: var(--text-muted)">${exp.date.split('-').reverse().join('/')}</td>
            `;
            expenseListContainer.appendChild(row);
        });

        const emptyState = document.getElementById('empty-state');
        if (recent.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    };

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
            const response = await fetch('http://localhost:5000/api/insights', {
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
        
        expenses.push({ id: crypto.randomUUID(), amount, category, date, note });
        saveState();
        render();
        expenseForm.reset();
        // Feedback
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => saveBtn.textContent = 'Save Transaction', 2000);
    });

    budgetInput.addEventListener('input', (e) => {
        budget = parseFloat(e.target.value) || 0;
        saveState();
        render();
    });

    refreshAIBtn.addEventListener('click', fetchAIInsights);

    // Filters
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
