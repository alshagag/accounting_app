import ProductsModal from "./FullEditProductsModal/ProductsModalTable";
import FullEditProductsModal from "./FullEditProductsModal/FullEditProductsModal";
import BarcodeScannerModal from "./FullEditProductsModal/BarcodeScannerModal";
import AddProductModal from "./FullEditProductsModal/AddProductModal";
import ViewProductModal from "./FullEditProductsModal/ViewProductModal";
import PurchasesModal from "./PurchasesModal";
import FullEditTransactionModal from "./FullEditTransactionModal";
import PartiesModal from "./PartiesModal";
import PartyDetailsModal from "./PartyDetailsModal";
import SalesInvoiceModal from "./SalesInvoiceModal";
import AboutModal from "./AboutModal";
import DeveloperModal from "./DeveloperModal";
import ContactModal from "./ContactModal";
import InstallModal from "./InstallModal";
import AllItemsModal from "./AllItemsModal";
import DocumentEditorModal from "./DocumentEditorModal";
import DocumentDetailsModal from "./DocumentDetailsModal";
import FullEditSaleModal from "./FullEditSaleModal";
import VoucherModal from "./Voucher/index.jsx";
import VoucherDetailsModal from "./Voucher/VoucherDetailsModal.jsx";

export default function ModalProvider() {
  return (
    <>
      <ContactModal />
      <AboutModal />
      <DeveloperModal />
      <InstallModal />
      <ProductsModal />
      <FullEditProductsModal />
      <BarcodeScannerModal />
      <AddProductModal />
      <ViewProductModal />
      <PurchasesModal />
      <FullEditTransactionModal />
      <FullEditSaleModal />
      <PartiesModal />
      <PartyDetailsModal />
      <SalesInvoiceModal />
      <AllItemsModal />
      <DocumentEditorModal />
      <DocumentDetailsModal />
      <VoucherModal />
      <VoucherDetailsModal />
    </>
  );
}