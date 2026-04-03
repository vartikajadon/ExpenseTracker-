/**
 * AI-Assisted Expense Tracker | Intelligent Dashboard Logic
 * Handles state, analytics, budget tracking, CSV export, and AI Insights via Groq.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let expenses = [];
    let budget = 0;
    let selectedCurrency = 'INR';
    let expenseChart = null;
    let filters = { from: '', to: '', category: 'All' };
    let groqApiKey = '';

    // --- Configuration ---
    const currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const categories = ["Food & Drink", "Transport", "Housing", "Health", "Entertainment", "Shopping", "Education", "Other"];
    const categoryColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    // --- DOM Elements ---
    const expenseForm = document.getElementById('expense-form');
    const expenseListContainer = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-state');
    const expenseTable = document.getElementById('expense-table');
    const totalAmountDisplay = document.getElementById('total-amount');
    const currencySelect = document.getElementById('currency-select');
    
    // Budget & Progress
    const budgetInput = document.getElementById('monthly-budget');
    const budgetProgress = document.getElementById('budget-progress');
    const budgetMessage = document.getElementById('budget-message');
    
    // Filters & Export
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const filterCategory = document.getElementById('filter-category');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const downloadCSVBtn = document.getElementById('download-csv');

    // AI Section
    const aiContent = document.getElementById('ai-content');
    const refreshAIBtn = document.getElementById('refresh-ai');

    // Modals
    const editModal = document.getElementById('edit-modal');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings');
    const clearKeyBtn = document.getElementById('clear-api-key');
    const apiKeyInput = document.getElementById('groq-api-key');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // --- Initialization ---
    const init = () => {
        setMaxDate(document.getElementById('date'));
        setMaxDate(filterFrom);
        setMaxDate(filterTo);
        loadState();
        initChart();
        render();
    };

    const setMaxDate = (el) => { if (el) el.max = new Date().toISOString().split('T')[0]; };

    // --- Persistence ---
    const loadState = () => {
        expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        budget = parseFloat(localStorage.getItem('budget')) || 0;
        groqApiKey = localStorage.getItem('groq_api_key') || '';
        
        if (budgetInput) budgetInput.value = budget > 0 ? budget : '';
        if (apiKeyInput) apiKeyInput.value = groqApiKey;
    };

    const saveState = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('budget', budget.toString());
        localStorage.setItem('groq_api_key', groqApiKey);
    };

    // --- Analytics ---
    const initChart = () => {
        const ctx = document.getElementById('expense-chart').getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{ data: categories.map(() => 0), backgroundColor: categoryColors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15, font: { size: 10 } } } },
                cutout: '75%'
            }
        });
    };

    const updateChart = (data) => {
        if (!expenseChart) return;
        const totals = categories.map(cat => data.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0));
        expenseChart.data.datasets[0].data = totals;
        expenseChart.update();
    };

    // --- Core Logic ---
    const getFilteredExpenses = () => {
        return expenses.filter(e => {
            const dateMatch = (!filters.from || e.date >= filters.from) && (!filters.to || e.date <= filters.to);
            const categoryMatch = filters.category === 'All' || e.category === filters.category;
            return dateMatch && categoryMatch;
        });
    };

    const updateBudgetProgress = (total) => {
        if (budget <= 0) {
            budgetProgress.style.width = '0%';
            budgetMessage.textContent = 'Set a budget to track progress.';
            return;
        }

        const percent = Math.min((total / budget) * 100, 100);
        budgetProgress.style.width = `${percent}%`;
        
        if (percent >= 100) {
            budgetProgress.className = 'progress-bar danger';
            budgetMessage.innerHTML = `<span style="color: var(--danger-color)">⚠️ Budget Exceeded by ${currencySymbols[selectedCurrency]}${(total - budget).toFixed(2)}</span>`;
        } else if (percent >= 80) {
            budgetProgress.className = 'progress-bar warning';
            budgetMessage.textContent = 'Approaching budget limit.';
        } else {
            budgetProgress.className = 'progress-bar';
            budgetMessage.textContent = 'Within Budget';
        }
    };

    /**
     * Main Render Loop
     */
    const render = () => {
        const filtered = getFilteredExpenses();
        const symbol = currencySymbols[selectedCurrency];
        const total = filtered.reduce((s, e) => s + e.amount, 0);

        // Update Summary
        totalAmountDisplay.textContent = `${symbol}${total.toFixed(2)}`;
        updateBudgetProgress(total);
        updateChart(filtered);

        // Update Table
        expenseListContainer.innerHTML = '';
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            expenseTable.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            expenseTable.classList.remove('hidden');
            [...filtered].reverse().forEach(exp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Date">${exp.date}</td>
                    <td data-label="Category"><span class="category-badge">${exp.category}</span></td>
                    <td data-label="Amount" class="amount-cell">${symbol}${exp.amount.toFixed(2)}</td>
                    <td data-label="Note">${exp.note || '-'}</td>
                    <td data-label="Actions" class="actions-cell">
                        <button class="edit-btn" data-id="${exp.id}">Edit</button>
                        <button class="delete-btn" data-id="${exp.id}">Delete</button>
                    </td>
                `;
                expenseListContainer.appendChild(row);
            });
        }
    };

    // --- AI Insights (Groq) ---
    const fetchAIInsights = async () => {
        if (!groqApiKey) {
            aiContent.innerHTML = '<p class="placeholder-text">Please set your Groq API Key in settings.</p>';
            return;
        }

        aiContent.innerHTML = '<p class="placeholder-text">Analyzing your spending behavior...</p>';
        
        const summary = categories.map(cat => {
            const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
            return total > 0 ? `${cat}: ${total}` : null;
        }).filter(x => x).join(', ');

        const prompt = `Analyze this spending data and provide 3 short, actionable financial insights in bullet points. Data summary: Budget is ${budget}, Total Spent is ${expenses.reduce((s,e)=>s+e.amount,0)}, Category Breakdown: ${summary}. Keep it friendly and concise.`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            const result = await response.json();
            const content = result.choices[0].message.content;
            
            // Format bullet points
            const points = content.split('\n').filter(p => p.trim()).map(p => `<li class="insight-item">${p.replace(/^[\s*-]+/, '')}</li>`).join('');
            aiContent.innerHTML = `<ul class="insight-list">${points}</ul>`;
        } catch (error) {
            aiContent.innerHTML = '<p class="placeholder-text" style="color: var(--danger-color)">Failed to fetch AI insights. Check your API key.</p>';
        }
    };

    // --- Event Handlers ---
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;

        if (date > new Date().toISOString().split('T')[0]) return alert("Future dates not allowed.");

        expenses.push({ id: crypto.randomUUID(), amount, category, date, note });
        saveState();
        render();
        expenseForm.reset();
    });

    expenseListContainer.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('delete-btn')) {
            if (confirm("Delete this transaction?")) {
                expenses = expenses.filter(exp => exp.id !== id);
                saveState();
                render();
            }
        } else if (e.target.classList.contains('edit-btn')) {
            const exp = expenses.find(x => x.id === id);
            if (!exp) return;
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-amount').value = exp.amount;
            document.getElementById('edit-category').value = exp.category;
            document.getElementById('edit-date').value = exp.date;
            document.getElementById('edit-note').value = exp.note || '';
            editModal.classList.remove('hidden');
        }
    });

    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const idx = expenses.findIndex(x => x.id === id);
        if (idx > -1) {
            expenses[idx] = { ...expenses[idx], 
                amount: parseFloat(document.getElementById('edit-amount').value),
                category: document.getElementById('edit-category').value,
                date: document.getElementById('edit-date').value,
                note: document.getElementById('edit-note').value
            };
            saveState();
            render();
            editModal.classList.add('hidden');
        }
    });

    // Budget Input
    budgetInput.addEventListener('input', (e) => {
        budget = parseFloat(e.target.value) || 0;
        saveState();
        render();
    });

    // Filtering
    const updateFilters = () => {
        filters.from = filterFrom.value;
        filters.to = filterTo.value;
        filters.category = filterCategory.value;
        render();
    };

    filterFrom.addEventListener('change', updateFilters);
    filterTo.addEventListener('change', updateFilters);
    filterCategory.addEventListener('change', updateFilters);
    clearFiltersBtn.addEventListener('click', () => {
        filterFrom.value = filterTo.value = '';
        filterCategory.value = 'All';
        filters = { from: '', to: '', category: 'All' };
        render();
    });

    // CSV Export
    downloadCSVBtn.addEventListener('click', () => {
        const headers = ['Date', 'Category', 'Amount', 'Note'];
        const rows = expenses.map(e => [e.date, e.category, e.amount, `"${e.note || ''}"`]);
        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });

    // Settings & Meta
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    saveSettingsBtn.addEventListener('click', () => {
        groqApiKey = apiKeyInput.value;
        saveState();
        settingsModal.classList.add('hidden');
        fetchAIInsights();
    });
    clearKeyBtn.addEventListener('click', () => {
        apiKeyInput.value = groqApiKey = '';
        saveState();
    });
    refreshAIBtn.addEventListener('click', fetchAIInsights);
    currencySelect.addEventListener('change', (e) => { selectedCurrency = e.target.value; render(); });
    closeModalBtns.forEach(b => b.addEventListener('click', () => {
        editModal.classList.add('hidden');
        settingsModal.classList.add('hidden');
    }));

    init();
});
