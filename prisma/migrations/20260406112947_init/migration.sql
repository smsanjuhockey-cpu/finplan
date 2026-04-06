-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('salaried', 'self_employed', 'freelancer', 'business_owner', 'retired', 'student');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('old', 'new');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('savings', 'current', 'salary', 'wallet', 'credit_card', 'ppf', 'epf', 'nps', 'fd', 'rd', 'demat');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer', 'investment');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('monthly', 'yearly', 'custom');

-- CreateEnum
CREATE TYPE "BudgetMethod" AS ENUM ('custom', 'fifty_thirty_twenty', 'zero_based');

-- CreateEnum
CREATE TYPE "BudgetBucket" AS ENUM ('needs', 'wants', 'savings', 'uncategorized');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'halfyearly', 'yearly');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('emi', 'sip', 'rd', 'insurance_premium', 'subscription', 'rent', 'salary', 'ppf', 'nps', 'other');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('emergency_fund', 'home_purchase', 'vehicle', 'vacation', 'education', 'wedding', 'retirement', 'children_education', 'custom');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('savings_account', 'fd', 'rd', 'mutual_fund', 'stocks', 'ppf', 'epf', 'nps', 'real_estate', 'gold_physical', 'gold_etf', 'sgb', 'crypto', 'other');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('home_loan', 'car_loan', 'personal_loan', 'education_loan', 'credit_card', 'gold_loan', 'business_loan', 'other');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('reducing_balance', 'interest_only', 'bullet', 'overdraft');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('monthly_analysis', 'anomaly', 'forecast', 'suggestion', 'tax_advice', 'goal_recommendation');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('info', 'warning', 'success', 'critical');

-- CreateEnum
CREATE TYPE "LifeEventType" AS ENUM ('baby_arriving', 'maternity_leave', 'job_change', 'salary_increment', 'bonus_received', 'marriage', 'home_purchase', 'parent_support', 'medical_emergency', 'other');

-- CreateEnum
CREATE TYPE "DebtStrategy" AS ENUM ('avalanche', 'snowball', 'custom');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('manual', 'pending', 'active', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "avatarUrl" TEXT,
    "hashedPassword" TEXT,
    "panNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "annualIncome" BIGINT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'salaried',
    "taxRegime" "TaxRegime" NOT NULL DEFAULT 'new',
    "financialYearStart" INTEGER NOT NULL DEFAULT 4,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "institutionName" TEXT,
    "accountNumberLast4" TEXT,
    "ifscCode" TEXT,
    "currentBalance" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "externalAccountId" TEXT,
    "syncProvider" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'manual',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "type" "TransactionType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT,
    "recurringRuleId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "merchantName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "isTaxRelevant" BOOLEAN NOT NULL DEFAULT false,
    "taxSection" TEXT,
    "externalTxnId" TEXT,
    "isManuallyEntered" BOOLEAN NOT NULL DEFAULT true,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalyScore" DECIMAL(5,4),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "BudgetPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "budgetMethod" "BudgetMethod" NOT NULL DEFAULT 'custom',
    "needsAmount" BIGINT,
    "wantsAmount" BIGINT,
    "savingsAmount" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "allocatedAmount" BIGINT NOT NULL,
    "bucket" "BudgetBucket" NOT NULL DEFAULT 'uncategorized',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "instrumentType" "InstrumentType" NOT NULL DEFAULT 'other',
    "loanPrincipal" BIGINT,
    "loanInterestRate" DECIMAL(6,4),
    "loanTenureMonths" INTEGER,
    "loanOutstanding" BIGINT,
    "sipFolioNumber" TEXT,
    "sipFundName" TEXT,
    "sipExpectedReturn" DECIMAL(6,4),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueDayOfMonth" INTEGER,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastProcessedDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoGenerateTxn" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'custom',
    "targetAmount" BIGINT NOT NULL,
    "currentAmount" BIGINT NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "priority" "GoalPriority" NOT NULL DEFAULT 'medium',
    "linkedSipRuleId" TEXT,
    "expectedReturnRate" DECIMAL(6,4),
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" BIGINT NOT NULL,
    "note" TEXT,
    "contributedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "currentValue" BIGINT NOT NULL,
    "purchaseValue" BIGINT,
    "purchaseDate" TIMESTAMP(3),
    "fdInterestRate" DECIMAL(6,4),
    "fdMaturityDate" TIMESTAMP(3),
    "fdBankName" TEXT,
    "fdMaturityValue" BIGINT,
    "folioNumber" TEXT,
    "units" DECIMAL(15,4),
    "nav" BIGINT,
    "isin" TEXT,
    "accountNumber" TEXT,
    "nomineeName" TEXT,
    "propertyAddress" TEXT,
    "goldGrams" DECIMAL(10,3),
    "institutionName" TEXT,
    "notes" TEXT,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "liabilityType" "LiabilityType" NOT NULL,
    "loanType" "LoanType" NOT NULL DEFAULT 'reducing_balance',
    "lenderName" TEXT NOT NULL,
    "principalAmount" BIGINT NOT NULL,
    "outstandingAmount" BIGINT NOT NULL,
    "interestRate" DECIMAL(6,4) NOT NULL,
    "emiAmount" BIGINT,
    "loanStartDate" TIMESTAMP(3),
    "loanEndDate" TIMESTAMP(3),
    "creditLimit" BIGINT,
    "dueDate" INTEGER,
    "minimumDue" BIGINT,
    "linkedAccountId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payoff_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Debt Plan',
    "strategy" "DebtStrategy" NOT NULL DEFAULT 'avalanche',
    "monthlyExtra" BIGINT NOT NULL DEFAULT 0,
    "debtFreeDate" TIMESTAMP(3),
    "totalInterest" BIGINT,
    "interestSaved" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_payoff_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payoff_milestones" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "monthOffset" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "balances" JSONB NOT NULL,
    "totalDebt" BIGINT NOT NULL,
    "interestPaid" BIGINT NOT NULL,
    "principalPaid" BIGINT NOT NULL,

    CONSTRAINT "debt_payoff_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalAssets" BIGINT NOT NULL,
    "totalLiabilities" BIGINT NOT NULL,
    "netWorth" BIGINT NOT NULL,
    "assetsBreakdown" JSONB NOT NULL,
    "liabilitiesBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_health_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreDate" TIMESTAMP(3) NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "budgetAdherence" INTEGER NOT NULL,
    "savingsRate" INTEGER NOT NULL,
    "emergencyFund" INTEGER NOT NULL,
    "debtToIncome" INTEGER NOT NULL,
    "goalProgress" INTEGER NOT NULL,
    "netWorthGrowth" INTEGER NOT NULL,
    "monthlyIncome" BIGINT,
    "monthlyExpenses" BIGINT,
    "monthlySavings" BIGINT,
    "insightsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" TIMESTAMP(3),
    "contextHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "modelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_planning_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "amountInvested" BIGINT NOT NULL,
    "maxDeductionLimit" BIGINT NOT NULL,
    "taxSavedOldRegime" BIGINT,
    "taxSavedNewRegime" BIGINT,
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_planning_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LifeEventType" NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedDate" TIMESTAMP(3) NOT NULL,
    "financialImpact" BIGINT,
    "oneTimeCost" BIGINT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DebtPayoffPlanToLiability" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DebtPayoffPlanToLiability_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "transaction_categories_userId_idx" ON "transaction_categories"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_date_idx" ON "transactions"("userId", "categoryId", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_accountId_date_idx" ON "transactions"("accountId", "date" DESC);

-- CreateIndex
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

-- CreateIndex
CREATE INDEX "recurring_rules_userId_idx" ON "recurring_rules"("userId");

-- CreateIndex
CREATE INDEX "recurring_rules_nextDueDate_idx" ON "recurring_rules"("nextDueDate");

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "goals"("userId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_idx" ON "goal_contributions"("goalId");

-- CreateIndex
CREATE INDEX "assets_userId_idx" ON "assets"("userId");

-- CreateIndex
CREATE INDEX "assets_userId_assetType_idx" ON "assets"("userId", "assetType");

-- CreateIndex
CREATE INDEX "liabilities_userId_idx" ON "liabilities"("userId");

-- CreateIndex
CREATE INDEX "debt_payoff_plans_userId_idx" ON "debt_payoff_plans"("userId");

-- CreateIndex
CREATE INDEX "debt_payoff_milestones_planId_idx" ON "debt_payoff_milestones"("planId");

-- CreateIndex
CREATE INDEX "net_worth_snapshots_userId_snapshotDate_idx" ON "net_worth_snapshots"("userId", "snapshotDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_userId_snapshotDate_key" ON "net_worth_snapshots"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "financial_health_scores_userId_scoreDate_idx" ON "financial_health_scores"("userId", "scoreDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "financial_health_scores_userId_scoreDate_key" ON "financial_health_scores"("userId", "scoreDate");

-- CreateIndex
CREATE INDEX "ai_insights_userId_isRead_isDismissed_idx" ON "ai_insights"("userId", "isRead", "isDismissed");

-- CreateIndex
CREATE INDEX "ai_chat_messages_userId_sessionId_createdAt_idx" ON "ai_chat_messages"("userId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "tax_planning_entries_userId_financialYear_idx" ON "tax_planning_entries"("userId", "financialYear");

-- CreateIndex
CREATE INDEX "life_events_userId_idx" ON "life_events"("userId");

-- CreateIndex
CREATE INDEX "_DebtPayoffPlanToLiability_B_index" ON "_DebtPayoffPlanToLiability"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_linkedSipRuleId_fkey" FOREIGN KEY ("linkedSipRuleId") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payoff_plans" ADD CONSTRAINT "debt_payoff_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payoff_milestones" ADD CONSTRAINT "debt_payoff_milestones_planId_fkey" FOREIGN KEY ("planId") REFERENCES "debt_payoff_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_health_scores" ADD CONSTRAINT "financial_health_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_planning_entries" ADD CONSTRAINT "tax_planning_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_planning_entries" ADD CONSTRAINT "tax_planning_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_events" ADD CONSTRAINT "life_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DebtPayoffPlanToLiability" ADD CONSTRAINT "_DebtPayoffPlanToLiability_A_fkey" FOREIGN KEY ("A") REFERENCES "debt_payoff_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DebtPayoffPlanToLiability" ADD CONSTRAINT "_DebtPayoffPlanToLiability_B_fkey" FOREIGN KEY ("B") REFERENCES "liabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
