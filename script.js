/**
 * AI-Assisted Expense Tracker | Advanced Dashboard Logic
 * Handles state, analytics (Chart.js), filtering, and CRUD operations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let expenses = [];
    let selectedCurrency = 'INR';
    let expenseChart = null; // Chart.js instance
    let filters = { from: '', to: '' };

    // --- Configuration ---
    const currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const categories = ["Food & Drink", "Transport", "Housing", "Health", "Entertainment", "Shopping", "Education", "Other"];
    const categoryColors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
    ];

    // --- DOM Elements ---
    const expenseForm = document.getElementById('expense-form');
    const expenseListContainer = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-state');
    const expenseTable = document.getElementById('expense-table');
    const totalAmountDisplay = document.getElementById('total-amount');
    const currencySelect = document.getElementById('currency-select');
    const dateInput = document.getElementById('date');
    
    // Filter Elements
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const clearFiltersBtn = document.getElementById('clear-filters');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // --- Initialization ---
    const init = () => {
        setMaxDate(dateInput);
        setMaxDate(filterFrom);
        setMaxDate(filterTo);
        loadFromLocalStorage();
        initChart();
        renderExpenses();
    };

    /**
     * Sets the maximum selectable date to today's date for an input.
     */
    const setMaxDate = (element) => {
        if (element) {
            element.max = new Date().toISOString().split('T')[0];
        }
    };

    // --- Data Persistence ---
    const loadFromLocalStorage = () => {
        const saved = localStorage.getItem('expenses');
        if (saved) expenses = JSON.parse(saved);
    };

    const saveToLocalStorage = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    };

    // --- Analytics (Chart.js) ---
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
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } }
                },
                cutout: '70%'
            }
        });
    };

    const updateChart = (data) => {
        if (!expenseChart) return;
        
        // Aggregate totals by category
        const totals = categories.map(cat => {
            return data
                .filter(exp => exp.category === cat)
                .reduce((sum, exp) => sum + exp.amount, 0);
        });

        expenseChart.data.datasets[0].data = totals;
        expenseChart.update();
    };

    // --- Core Logic ---
    const getFilteredExpenses = () => {
        return expenses.filter(exp => {
            const expDate = exp.date;
            const fromMatch = !filters.from || expDate >= filters.from;
            const pathMatch = !filters.to || expDate <= filters.to;
            return fromMatch && pathMatch;
        });
    };

    const calculateTotal = (data) => {
        return data.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    };

    /**
     * Main Rendering Function
     * Updates Table, Summary, and Chart based on current state & filters.
     */
    const renderExpenses = () => {
        const filteredData = getFilteredExpenses();
        const symbol = currencySymbols[selectedCurrency];

        // Clear and rebuild table
        expenseListContainer.innerHTML = '';
        
        if (filteredData.length === 0) {
            emptyState.classList.remove('hidden');
            expenseTable.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            expenseTable.classList.remove('hidden');
            
            // Newest first
            [...filteredData].reverse().forEach(exp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${exp.date}</td>
                    <td><span class="category-badge">${exp.category}</span></td>
                    <td class="amount-cell">${symbol}${exp.amount.toFixed(2)}</td>
                    <td>${exp.note || '-'}</td>
                    <td class="actions-cell">
                        <button class="edit-btn" data-id="${exp.id}">Edit</button>
                        <button class="delete-btn" data-id="${exp.id}">Delete</button>
                    </td>
                `;
                expenseListContainer.appendChild(row);
            });
        }

        // Update Summary & Chart
        const total = calculateTotal(filteredData);
        totalAmountDisplay.textContent = `${symbol}${total.toFixed(2)}`;
        updateChart(filteredData);
    };

    // --- Event Handlers ---

    // Submit New Expense
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;

        if (date > new Date().toISOString().split('T')[0]) {
            alert("Future dates are not allowed.");
            return;
        }

        const newExp = { id: Date.now(), amount, category, date, note };
        expenses.push(newExp);
        saveToLocalStorage();
        renderExpenses();
        expenseForm.reset();
    });

    // Handle Edit/Delete Button Clicks
    expenseListContainer.addEventListener('click', (e) => {
        const id = Number(e.target.dataset.id);
        if (!id) return;

        if (e.target.classList.contains('delete-btn')) {
            if (confirm("Permanently delete this transaction?")) {
                expenses = expenses.filter(exp => exp.id !== id);
                saveToLocalStorage();
                renderExpenses();
            }
        } else if (e.target.classList.contains('edit-btn')) {
            openEditModal(id);
        }
    });

    // Modal Operations
    const openEditModal = (id) => {
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;

        document.getElementById('edit-id').value = id;
        document.getElementById('edit-amount').value = exp.amount;
        document.getElementById('edit-category').value = exp.category;
        document.getElementById('edit-date').value = exp.date;
        document.getElementById('edit-note').value = exp.note || '';
        
        editModal.classList.remove('hidden');
    };

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = Number(document.getElementById('edit-id').value);
        const idx = expenses.findIndex(exp => exp.id === id);

        if (idx > -1) {
            expenses[idx] = {
                ...expenses[idx],
                amount: parseFloat(document.getElementById('edit-amount').value),
                category: document.getElementById('edit-category').value,
                date: document.getElementById('edit-date').value,
                note: document.getElementById('edit-note').value
            };
            saveToLocalStorage();
            renderExpenses();
            editModal.classList.add('hidden');
        }
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => editModal.classList.add('hidden'));
    });

    // Filters
    const handleFilterUpdate = () => {
        filters.from = filterFrom.value;
        filters.to = filterTo.value;
        
        if (filters.from && filters.to && filters.from > filters.to) {
            alert("'From' date must be before 'To' date.");
            filterFrom.value = '';
            filters.from = '';
        }
        renderExpenses();
    };

    filterFrom.addEventListener('change', handleFilterUpdate);
    filterTo.addEventListener('change', handleFilterUpdate);
    
    clearFiltersBtn.addEventListener('click', () => {
        filterFrom.value = '';
        filterTo.value = '';
        filters = { from: '', to: '' };
        renderExpenses();
    });

    currencySelect.addEventListener('change', (e) => {
        selectedCurrency = e.target.value;
        renderExpenses();
    });

    // Start App
    init();
});
