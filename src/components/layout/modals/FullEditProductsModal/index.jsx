import ProductsModalTable from "./ProductsModalTable";
import BarcodeScannerModal from "./BarcodeScannerModal";
import AddProductModal from "./AddProductModal";
import ViewProductModal from "./ViewProductModal";


export default function FullEditProductsModalIndex() {
    return (
        <>
            <ProductsModalTable />
            <BarcodeScannerModal />
            <AddProductModal />
            <ViewProductModal />
        </>
    );
}