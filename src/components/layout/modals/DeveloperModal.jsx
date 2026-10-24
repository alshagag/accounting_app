import Image from "next/image";

export default function DeveloperModal() {
  return (
    <div className="modal fade" id="developerModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-circle"></i>{" "}
              عن المطور
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body text-center py-4">
            <Image
              src="/profile.jpg"
              alt="صورة المطور"
              width={80}
              height={80}
              style={{ borderRadius: "50%", marginBottom: 15 }}
            />
            <h4>محمد الشقاق</h4>
            <p className="text">
              مطور ويب حاصل على بكالوريوس علوم الحاسب من جامعة ليفربول، متخصص في
              تطوير تطبيقات الويب، وتحسين تجربة المستخدم (UX)، ومهتم بمجال تحليل
              البيانات الضخمة (Big Data) وبناء حلول تقنية حديثة وعالية الكفاءة.
            </p>

            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap mt-3">
              <a
                href="https://linktr.ee/alshagag"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44 }}
                title="حساب المطور على Linktree"
                aria-label="حساب المطور على Linktree"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  width="20"
                  height="20"
                  style={{ fill: "currentColor" }}
                  aria-hidden="true"
                >
                  <path d="M112 237.4L237.8 237.4L148.4 152L197.9 101L283.1 188.8L283.1 64L357 64L357 188.8L442.2 101.2L491.6 152L402.2 237.2L527.9 237.2L527.9 307.7L401.5 307.7L491.5 395.3L442.2 445.1L320 322.1L197.8 445.1L148.3 395.5L238.3 307.9L111.9 307.9L111.9 237.4zM282.9 408.8L356.8 408.8L356.8 576L282.9 576L282.9 408.8z" />
                </svg>
              </a>

              <a
                href="https://github.com/alshagag"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44 }}
                title="تابع المشروع على GitHub"
                aria-label="تابع المشروع على GitHub"
              >
                <i className="bi bi-github fs-5"></i>
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
