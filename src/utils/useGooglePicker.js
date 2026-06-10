// useGooglePicker.js
import { useCallback } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PICKER_API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

function loadScript(src) {
    return new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => res();
        s.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
    });
}

export function useGooglePicker() {
    const openPicker = useCallback((onFilePicked, accept) => {
        const launch = (accessToken) => {
            const view = new window.google.picker.DocsView()
                .setIncludeFolders(false)
                .setSelectFolderEnabled(false);

            if (accept === 'pdf') {
                view.setMimeTypes('application/pdf');
            } else if (accept === 'office') {
                view.setMimeTypes(
                    'application/pdf,' +
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
                    'application/msword'
                );
            }

            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(accessToken)
                .setDeveloperKey(PICKER_API_KEY)
                .setCallback(async (data) => {
                    if (data.action !== window.google.picker.Action.PICKED) return;
                    const doc = data.docs[0];

                    const res = await fetch(
                        `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    if (!res.ok) throw new Error('Failed to download file from Drive');
                    const blob = await res.blob();
                    const file = new File([blob], doc.name, { type: blob.type || doc.mimeType });
                    onFilePicked(file);
                })
                .build();

            picker.setVisible(true);
        };

        Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client'),
        ]).then(() => {
            window.gapi.load('picker', () => {
                window.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp) => {
                        if (resp.error) throw new Error(resp.error);
                        launch(resp.access_token);
                    },
                });
                window.tokenClient.requestAccessToken({ prompt: '' });
            });
        });
    }, []);

    return { openPicker };
}