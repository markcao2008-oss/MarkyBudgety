// DOM Element Selectors
const balance = document.getElementById('total-balance');
const income = document.getElementById('total-income');
const expenses = document.getElementById('total-expenses');
const debtDisplay = document.getElementById('total-debt');
const list = document.getElementById('transaction-list');
const goalsListWrapper = document.getElementById('goals-list-wrapper');
const debtsListWrapper = document.getElementById('debts-list-wrapper');
const reportsListWrapper = document.getElementById('monthly-reports-wrapper'); 

// External Storage Element Selectors
const storageListWrapper = document.getElementById('storage-list-wrapper');
const storageForm = document.getElementById('storage-form-element');
const storageLocationInput = document.getElementById('storage-location');
const storageAmountInput = document.getElementById('storage-amount');
const storageCurrencySelect = document.getElementById('storage-currency');

// Forms Setup
const form = document.getElementById('budget-form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const tagSelect = document.getElementById('tag-select'); 

const goalForm = document.getElementById('goal-form-element');
const goalNameInput = document.getElementById('goal-name');
const goalTargetInput = document.getElementById('goal-target');
const goalCurrencySelect = document.getElementById('goal-currency');

const debtForm = document.getElementById('debt-form-element');
const debtPersonInput = document.getElementById('debt-person');
const debtAmountInput = document.getElementById('debt-amount');
const debtCurrencySelect = document.getElementById('debt-currency');

const currencySelect = document.getElementById('currency-select');
const txCurrency = document.getElementById('tx-currency');
const resetAppBtn = document.getElementById('reset-app-btn');

// Intro Collapsible Selectors
const toggleIntroBtn = document.getElementById('toggle-intro-btn');
const introContentArea = document.getElementById('intro-content-area');
const introToggleIcon = document.getElementById('intro-toggle-icon');

const currencySymbols = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' };

// Core State Tracking
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];
let debts = JSON.parse(localStorage.getItem('debts')) || [];
let storageAssets = JSON.parse(localStorage.getItem('storageAssets')) || [];
let currentCurrency = localStorage.getItem('currency') || 'USD';
let introOpen = JSON.parse(localStorage.getItem('introOpen')) !== false; // Default true

if(currencySelect) currencySelect.value = currentCurrency;

// Set up Intro panel visibility on start
if (introContentArea && introToggleIcon) {
    if (!introOpen) {
        introContentArea.style.display = 'none';
        introToggleIcon.innerText = '▶';
    } else {
        introContentArea.style.display = 'block';
        introToggleIcon.innerText = '▼';
    }
}

// Collapsible Layout Event Handler
if (toggleIntroBtn) {
    toggleIntroBtn.addEventListener('click', () => {
        introOpen = !introOpen;
        localStorage.setItem('introOpen', introOpen);
        if (introOpen) {
            introContentArea.style.display = 'block';
            introToggleIcon.innerText = '▼';
        } else {
            introContentArea.style.display = 'none';
            introToggleIcon.innerText = '▶';
        }
    });
}

// Conversion Engine
async function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${currentCurrency}`);
        if (!res.ok) throw new Error("API Network issue");
        const data = await res.json();
        const rateFrom = data.rates[fromCurrency] || 1;
        const rateTo = data.rates[toCurrency] || 1;
        return (amount / rateFrom) * rateTo;
    } catch (err) {
        console.warn("Currency API stalled. Using 1:1 fallback rate.", err);
        return amount; 
    }
}

function generateID() { return Math.floor(Math.random() * 100000000); }

// Submit Action Functions
async function addTransaction(e) {
    e.preventDefault();
    const enteredAmount = +amount.value;
    const enteredCurrency = txCurrency.value;
    const convertedAmount = await convertCurrency(enteredAmount, enteredCurrency, currentCurrency);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    transactions.push({
        id: generateID(),
        text: text.value,
        origAmount: enteredAmount,
        origCurrency: enteredCurrency,
        amount: convertedAmount,
        tag: enteredAmount > 0 ? 'Income' : (tagSelect ? tagSelect.value : 'Other'), 
        month: currentMonthKey 
    });

    updateLocalStorage();
    init();
    text.value = '';
    amount.value = '';
}

async function addGoal(e) {
    e.preventDefault();
    const targetVal = +goalTargetInput.value;
    const currVal = goalCurrencySelect.value;
    const convertedTarget = await convertCurrency(targetVal, currVal, currentCurrency);

    goals.push({
        id: generateID(),
        name: goalNameInput.value,
        origTarget: targetVal,
        origCurrency: currVal,
        target: convertedTarget,
        purchased: false
    });

    updateLocalStorage();
    init();
    goalNameInput.value = '';
    goalTargetInput.value = '';
}

async function addDebt(e) {
    e.preventDefault();
    const owedVal = +debtAmountInput.value;
    const currVal = debtCurrencySelect.value;
    const convertedOwed = await convertCurrency(owedVal, currVal, currentCurrency);

    debts.push({
        id: generateID(),
        person: debtPersonInput.value,
        origTotal: owedVal,
        origCurrency: currVal,
        totalOwed: convertedOwed,
        remaining: convertedOwed 
    });

    updateLocalStorage();
    init(); 
    debtPersonInput.value = '';
    debtAmountInput.value = '';
}

async function addStorageAsset(e) {
    e.preventDefault();
    const storedVal = +storageAmountInput.value;
    const currVal = storageCurrencySelect.value;
    const convertedStored = await convertCurrency(storedVal, currVal, currentCurrency);

    storageAssets.push({
        id: generateID(),
        location: storageLocationInput.value,
        origAmount: storedVal,
        origCurrency: currVal,
        amount: convertedStored
    });

    updateLocalStorage();
    init(); 
    storageLocationInput.value = '';
    storageAmountInput.value = '';
}

// Rendering Methods
function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');
    item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
    const symbol = currencySymbols[currentCurrency] || currentCurrency;
    const origSymbol = currencySymbols[transaction.origCurrency] || transaction.origCurrency;
    const currentTag = transaction.tag || (transaction.amount > 0 ? 'Income' : 'Other');

    item.innerHTML = `
        <div style="max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <strong>[${currentTag}]</strong> ${transaction.text}
        </div>
        <span class="original-val">(${transaction.origAmount < 0 ? '-' : ''}${origSymbol}${Math.abs(transaction.origAmount).toFixed(2)})</span>
        <span class="converted-val">${sign}${symbol}${Math.abs(transaction.amount).toFixed(2)}</span>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
    `;
    list.appendChild(item);
}

function renderGoals(netBalance) {
    if (!goalsListWrapper) return;
    goalsListWrapper.innerHTML = '';
    if (goals.length === 0) {
        goalsListWrapper.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No active goals. Create one below!</p>`;
        return;
    }

    let availableSavings = netBalance > 0 ? netBalance : 0;
    const symbol = currencySymbols[currentCurrency] || currentCurrency;

    goals.forEach(goal => {
        let allocated = goal.purchased ? goal.target : Math.min(availableSavings, goal.target);
        if (!goal.purchased) {
            availableSavings -= allocated;
        }

        let percent = goal.target > 0 ? (allocated / goal.target) * 100 : 0;
        if (percent > 100) percent = 100;

        const missingAmount = Math.max(0, goal.target - allocated);
        
        let statusText = "";
        let colorClass = "var(--primary)";
        let actionButtonHTML = `<button class="mini-btn btn-del" onclick="deleteGoal(${goal.id})">Remove</button>`;

        if (goal.purchased) {
            statusText = "🛍️ Purchased & Logged!";
            colorClass = "#6366f1"; 
            actionButtonHTML = `<button class="mini-btn btn-del" onclick="deleteGoal(${goal.id})">Clear</button>`;
        } else if (percent >= 100) {
            statusText = "🎉 Fully funded!";
            colorClass = "var(--success)";
            actionButtonHTML = `
                <div style="display:flex; gap:6px;">
                    <button class="mini-btn btn-pay" onclick="buyGoalDirect(${goal.id})">🛍️ Purchase</button>
                    <button class="mini-btn btn-del" onclick="deleteGoal(${goal.id})">Remove</button>
                </div>
            `;
        } else {
            statusText = `🏃‍♂️ ${symbol}${missingAmount.toFixed(2)} away.`;
        }

        const block = document.createElement('div');
        block.classList.add('goal-item-block');
        if (goal.purchased) {
            block.style.borderLeft = "4px solid #6366f1";
            block.style.backgroundColor = "#fafafa";
        }
        
        block.innerHTML = `
            <div class="goal-item-header" style="margin-bottom: 8px;">
                <span class="goal-item-title" style="font-weight:600; ${goal.purchased ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">🎯 ${goal.name}</span>
                <div>${actionButtonHTML}</div>
            </div>
            <div class="progress-container" style="margin: 8px 0;">
                <div class="progress-fill goal-fill" style="width: ${percent}%; background: ${goal.purchased ? '#6366f1' : (percent >= 100 ? 'var(--success)' : '')}"></div>
            </div>
            <div class="goal-meta">
                <span>${percent.toFixed(1)}% Completed</span>
                <span>${symbol}${allocated.toFixed(2)} / ${symbol}${goal.target.toFixed(2)}</span>
            </div>
            <p style="font-size: 0.8rem; font-weight: 700; color: ${colorClass}; margin-top: 6px;">${statusText}</p>
        `;
        goalsListWrapper.appendChild(block);
    });
}

function renderDebts() {
    if (!debtsListWrapper) return;
    debtsListWrapper.innerHTML = '';
    if (debts.length === 0) {
        debtsListWrapper.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No current debts. Outstanding job!</p>`;
        return;
    }

    const symbol = currencySymbols[currentCurrency] || currentCurrency;

    debts.forEach(debt => {
        let total = isNaN(debt.totalOwed) ? 0 : debt.totalOwed;
        let remaining = isNaN(debt.remaining) ? 0 : debt.remaining;
        let paid = Math.max(0, total - remaining);
        
        let percent = total > 0 ? (paid / total) * 100 : 100;
        if (percent > 100) percent = 100;

        const block = document.createElement('div');
        block.classList.add('debt-item-block');
        block.innerHTML = `
            <div class="debt-item-header">
                <span class="debt-item-title">💸 Owe ${debt.person}</span>
            </div>
            <div class="progress-container">
                <div class="progress-fill debt-fill" style="width: ${percent}%"></div>
            </div>
            <div class="debt-meta" style="margin-bottom: 8px;">
                <span>${percent.toFixed(0)}% Repaid</span>
                <span>Remaining: ${symbol}${remaining.toFixed(2)} / ${symbol}${total.toFixed(2)}</span>
            </div>
            <div class="block-actions">
                <input type="number" step="0.01" placeholder="Amount" id="pay-input-${debt.id}">
                <button class="mini-btn btn-pay" onclick="payDebtDirect(${debt.id})">Pay Off</button>
                <button class="mini-btn btn-del" onclick="deleteDebt(${debt.id})">Delete</button>
            </div>
        `;
        debtsListWrapper.appendChild(block);
    });
}

function renderStorageAssets() {
    if (!storageListWrapper) return;
    storageListWrapper.innerHTML = '';
    
    if (storageAssets.length === 0) {
        storageListWrapper.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No external storage assets logged yet.</p>`;
        return;
    }

    const symbol = currencySymbols[currentCurrency] || currentCurrency;

    storageAssets.forEach(asset => {
        const block = document.createElement('div');
        block.classList.add('storage-item-block'); 

        block.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; font-size:0.9rem; margin-bottom:4px;">
                <span>🏦 Stored: ${asset.location}</span>
                <button class="mini-btn btn-del" onclick="deleteStorageAsset(${asset.id})">Remove</button>
            </div>
            <div class="storage-amount-value" style="margin-bottom: 10px;">
                ${symbol}${asset.amount.toFixed(2)}
            </div>
            <div class="block-actions">
                <input type="number" step="0.01" placeholder="Take out" id="withdraw-input-${asset.id}">
                <button class="mini-btn btn-pay" style="background-color: #e0e7ff; color: #4f46e5;" onclick="withdrawStorageDirect(${asset.id})">Withdraw</button>
            </div>
        `;
        storageListWrapper.appendChild(block);
    });
}

function renderMonthlyReports() {
    if (!reportsListWrapper) return;
    reportsListWrapper.innerHTML = '';

    if (transactions.length === 0) {
        reportsListWrapper.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No transaction logs available.</p>`;
        return;
    }

    const symbol = currencySymbols[currentCurrency] || currentCurrency;
    const monthlyData = {};

    transactions.forEach(t => {
        const monthKey = t.month || "Legacy";
        const categoryTag = t.tag || (t.amount > 0 ? "Income" : "Other");

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { totalIncome: 0, totalSpend: 0, tagsBreakdown: {} };
        }

        if (t.amount > 0) {
            monthlyData[monthKey].totalIncome += t.amount;
        } else {
            const expenseValue = Math.abs(t.amount);
            monthlyData[monthKey].totalSpend += expenseValue;
            
            if (!monthlyData[monthKey].tagsBreakdown[categoryTag]) {
                monthlyData[monthKey].tagsBreakdown[categoryTag] = 0;
            }
            monthlyData[monthKey].tagsBreakdown[categoryTag] += expenseValue;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort().reverse();

    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        const monthBlock = document.createElement('div');
        monthBlock.classList.add('report-month-block');

        let tagsHTML = '';
        let chartSegmentsHTML = '';

        for (const [tag, amt] of Object.entries(data.tagsBreakdown)) {
            tagsHTML += `
                <div class="report-tag-row">
                    <span style="color: var(--text-muted);">🏷️ ${tag}:</span>
                    <span style="font-weight: 500;">${symbol}${amt.toFixed(2)}</span>
                </div>
            `;
        }

        if (tagsHTML === '') {
            tagsHTML = `<p style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No expenses recorded this month.</p>`;
        }

        const income = data.totalIncome;
        const spending = data.totalSpend;

        if (income === 0 && spending === 0) {
            chartSegmentsHTML = `<div class="chart-segment" style="width: 100%; background-color: #f1f5f9;"></div>`;
        } else if (income >= spending) {
            const spendPercentage = income > 0 ? (spending / income) * 100 : 0;
            const savingsPercentage = 100 - spendPercentage;

            if (spendPercentage > 0) {
                chartSegmentsHTML += `<div class="chart-segment" style="width: ${spendPercentage}%; background-color: #ec4899;"></div>`;
            }
            if (savingsPercentage > 0) {
                chartSegmentsHTML += `<div class="chart-segment" style="width: ${savingsPercentage}%; background-color: #10b981;"></div>`;
            }
        } else {
            chartSegmentsHTML += `<div class="chart-segment" style="width: 100%; background-color: #ef4444;"></div>`;
        }

        monthBlock.innerHTML = `
            <div class="report-month-header" style="border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 8px;">
                <span>📅 Month: ${month}</span>
                <span style="color: var(--danger);">Total Outflow: ${symbol}${spending.toFixed(2)}</span>
            </div>
            <div style="font-size:0.8rem; margin-bottom: 8px; display:flex; justify-content:space-between; font-weight:600; color:var(--success);">
                <span>Income Cashflow:</span>
                <span>+${symbol}${income.toFixed(2)}</span>
            </div>
            
            <div class="report-chart-bar">
                ${chartSegmentsHTML}
            </div>

            <div style="margin-top: 4px; padding-left: 4px;">
                <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom: 4px;">Category Breakdowns:</p>
                ${tagsHTML}
            </div>
        `;
        reportsListWrapper.appendChild(monthBlock);
    });
}

// Handler Actions
function buyGoalDirect(id) {
    goals = goals.map(g => {
        if (g.id === id && !g.purchased) {
            g.purchased = true; 

            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            transactions.push({
                id: generateID(),
                text: `Purchased Wish: ${g.name}`,
                origAmount: -g.origTarget,
                origCurrency: g.origCurrency,
                amount: -g.target,
                tag: 'Entertainment', 
                month: currentMonthKey
            });
        }
        return g;
    });

    updateLocalStorage();
    init(); 
}

async function payDebtDirect(id) {
    const payInput = document.getElementById(`pay-input-${id}`);
    if (!payInput) return;
    const payAmount = +payInput.value;
    if (payAmount <= 0) return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    debts = debts.map(debt => {
        if (debt.id === id) {
            debt.remaining = Math.max(0, debt.remaining - payAmount);
            transactions.push({
                id: generateID(),
                text: `Paid Back ${debt.person}`,
                origAmount: -payAmount,
                origCurrency: currentCurrency,
                amount: -payAmount,
                tag: 'Bills', 
                month: currentMonthKey
            });
        }
        return debt;
    });

    debts = debts.filter(debt => debt.remaining > 0);
    updateLocalStorage();
    init();
}

function withdrawStorageDirect(id) {
    const withdrawInput = document.getElementById(`withdraw-input-${id}`);
    if (!withdrawInput) return;
    const takeOutAmount = +withdrawInput.value;
    if (takeOutAmount <= 0) return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    storageAssets = storageAssets.map(asset => {
        if (asset.id === id) {
            asset.amount = Math.max(0, asset.amount - takeOutAmount);
            
            transactions.push({
                id: generateID(),
                text: `Withdrew from ${asset.location}`,
                origAmount: takeOutAmount,
                origCurrency: currentCurrency,
                amount: takeOutAmount,
                tag: 'Income',
                month: currentMonthKey
            });
        }
        return asset;
    });

    storageAssets = storageAssets.filter(asset => asset.amount > 0);
    updateLocalStorage();
    init();
}

function resetEntireApp() {
    if (confirm("Are you sure you want to completely reset MarkyBudgety? This deletes all data!")) {
        localStorage.clear();
        window.location.reload();
    }
}

function deleteStorageAsset(id) { storageAssets = storageAssets.filter(a => a.id !== id); updateLocalStorage(); init(); }
function removeTransaction(id) { transactions = transactions.filter(t => t.id !== id); updateLocalStorage(); init(); }
function deleteGoal(id) { goals = goals.filter(g => g.id !== id); updateLocalStorage(); init(); }
function deleteDebt(id) { debts = debts.filter(d => d.id !== id); updateLocalStorage(); init(); }

// Calculation Framework
function updateValues() {
    const transactionAmounts = transactions.map(t => t.amount);
    
    const globalDebtCalculated = debts.reduce((acc, d) => {
        let val = isNaN(d.remaining) ? 0 : d.remaining;
        return acc + val;
    }, 0);

    const incomeTotal = transactionAmounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
    const expenseTotal = transactionAmounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1;
    const netBalance = incomeTotal - expenseTotal;
    const symbol = currencySymbols[currentCurrency] || currentCurrency;

    if (balance) balance.innerText = `${netBalance < 0 ? '-' : ''}${symbol}${Math.abs(netBalance).toFixed(2)}`;
    if (income) income.innerText = `${symbol}${incomeTotal.toFixed(2)}`;
    if (expenses) expenses.innerText = `${symbol}${expenseTotal.toFixed(2)}`;
    
    if (debtDisplay) {
        debtDisplay.innerText = `${symbol}${isNaN(globalDebtCalculated) ? '0.00' : globalDebtCalculated.toFixed(2)}`;
    }

    renderGoals(netBalance);
    renderDebts();
    renderStorageAssets();
    renderMonthlyReports(); 
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('debts', JSON.stringify(debts));
    localStorage.setItem('storageAssets', JSON.stringify(storageAssets));
    localStorage.setItem('currency', currentCurrency);
}

async function handleBaseCurrencyChange() {
    const newCurrency = currencySelect.value;
    if (currentCurrency !== newCurrency) {
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${currentCurrency}`);
            const data = await res.json();
            const rate = data.rates[newCurrency];
            
            transactions = transactions.map(t => { t.amount = t.amount * rate; return t; });
            goals = goals.map(g => { g.target = g.target * rate; return g; });
            debts = debts.map(d => { 
                d.totalOwed = d.totalOwed * rate; 
                d.remaining = d.remaining * rate; 
                return d; 
            });
            storageAssets = storageAssets.map(a => {
                a.amount = a.amount * rate;
                return a;
            });
        } catch (err) { console.error("Exchange shift error."); }
    }
    currentCurrency = newCurrency;
    updateLocalStorage();
    init();
}

function init() {
    if (list) list.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues(); 
}

// Event Configuration
if (form) form.addEventListener('submit', addTransaction);
if (goalForm) goalForm.addEventListener('submit', addGoal);
if (debtForm) debtForm.addEventListener('submit', addDebt);
if (storageForm) storageForm.addEventListener('submit', addStorageAsset);
if (currencySelect) currencySelect.addEventListener('change', handleBaseCurrencyChange);
if (resetAppBtn) resetAppBtn.addEventListener('click', resetEntireApp);

init();