/**
 * AI-Assisted Expense Tracker
 * 
 * This script handles the initialization and future logic 
 * for the AI-Assisted Expense Tracker application.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial console message to confirm application has loaded
    console.log("AI-Assisted Expense Tracker initialized");
    
    // Select the expense form element
    const expenseForm = document.getElementById('expense-form');

    /**
     * Handles the form submission to create a new expense object.
     * @param {Event} event - The form submission event.
     */
    const handleFormSubmit = (event) => {
        // Prevent the browser's default form submission (page reload)
        event.preventDefault();

        // Get values from the form inputs
        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;

        // Basic validation (Amount, Category, and Date are required by HTML)
        if (!amount || !category || !date) {
            alert("Please fill in all required fields.");
            return;
        }

        // Create the expense object
        const newExpense = {
            id: Date.now(),
            amount: parseFloat(amount),
            category: category,
            date: date,
            note: note
        };

        // Log the created object to the console (temporary storage)
        console.log("New Expense Created:", newExpense);

        // Reset the form fields for next entry
        expenseForm.reset();
    };

    // Add event listener for form submission
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleFormSubmit);
    }
});
