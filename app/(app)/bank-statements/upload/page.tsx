import { BankStatementUploadForm } from "@/components/bank-statements/upload-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Table } from "lucide-react"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Upload Bank Statement",
  description: "Upload a PDF or CSV bank statement to extract transactions",
}

export default function UploadBankStatementPage() {
  return (
    <>
      <header className="flex items-center gap-4 mb-8">
        <Link href="/bank-statements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Upload Bank Statement</h2>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Statement</CardTitle>
              <CardDescription>
                Upload a PDF or CSV file from your bank to extract and import transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankStatementUploadForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Statements
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                PDF bank statements are processed using AI to extract transaction data.
                This works best with standard bank statement formats.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Transaction dates, descriptions, and amounts are extracted</li>
                <li>Debit and credit transactions are automatically categorized</li>
                <li>Bank name and account details are detected when available</li>
              </ul>
              <p className="text-xs mt-4">
                Note: PDF processing requires LLM settings to be configured in Settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                CSV Statements
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                CSV files exported from your bank are processed automatically.
                Common formats are detected, or you can manually map columns.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Automatic delimiter detection (comma, semicolon, tab)</li>
                <li>Column headers are auto-detected when present</li>
                <li>European and US date/number formats are supported</li>
              </ul>
              <p className="text-xs mt-4">
                Tip: Most banks offer CSV export in their online banking portal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
