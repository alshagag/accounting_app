"use client";

import { useEffect } from "react";
import { initApp } from "@/bootstrap/initApp";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import ToastContainer from "@/components/layout/ToastContainer";
import LoadingScreen from "@/components/layout/LoadingScreen";

import Statistics from "@/components/layout/Statistics";
import PeriodProfit from "@/components/layout/PeriodProfit";
import DashboardCards from "@/components/layout/DashboardCards";

import ProductSidebar from "@/components/layout/ProductSidebar";
import TransactionForm from "@/components/layout/TransactionForm";
import DocumentsTabs from "@/components/layout/documents/DocumentsTabs";

import ModalProvider from "@/components/layout/modals/ModalProvider";
import PurchaseInvoice from "@/components/layout/modals/PurchaseInvoiceModal";
import SettingsModal from "@/components/layout/modals/SettingsModal";
import PartyStatementModal from "@/components/layout/modals/PartyStatementModal";



export default function AccountingPage() {
    useEffect(() => {
        // سكربت initApp القديم يحتاج DOM جاهزًا بالكامل، لذا نؤجل التشغيل إلى ما بعد الرسم لضمان توفّر عناصر الجداول | The legacy initApp script needs a fully ready DOM, so we defer it until after paint to ensure table elements exist
        const animationFrameId = requestAnimationFrame(() => {
            initApp().catch((err) => {
                console.error('[APP] initApp failed:', err);
            });
        });
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <>
            {/* سكربت initApp القديم يتوقع وجود loadingBox وحاوية app | The legacy initApp script expects a loadingBox and an app container */}
            <LoadingScreen />

            <div id="app" className="d-none">
                <Header />

                <ToastContainer />

                <main className="container py-3">
                    <Statistics />

                    <PeriodProfit />

                    <main className="container py-0"></main>

                    <DashboardCards />

                    <div className="row g-4">
                        <ProductSidebar />


                        <div className="col-12 col-lg-8">
                            <TransactionForm />

                            <DocumentsTabs />
                        </div>
                    </div>
                </main>

                {/* جميع النوافذ المنبثقة | All modals */}
                <ModalProvider />
                <PurchaseInvoice />
                <SettingsModal />
                <PartyStatementModal />

                <Footer />
            </div>
        </>
    );
}