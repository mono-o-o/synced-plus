#[tauri::command]
fn write_content_uri(_app: tauri::AppHandle, uri: String, data: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JObject;

        let ctx = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(ctx.vm() as *mut _) }
            .map_err(|e| e.to_string())?;
        let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
        let activity = unsafe { JObject::from_raw(ctx.context() as *mut _) };

        let resolver = env
            .call_method(&activity, "getContentResolver", "()Landroid/content/ContentResolver;", &[])
            .map_err(|e| e.to_string())?
            .l()
            .map_err(|e| e.to_string())?;

        let uri_str = env.new_string(&uri).map_err(|e| e.to_string())?;
        let parsed_uri = env
            .call_static_method(
                "android/net/Uri",
                "parse",
                "(Ljava/lang/String;)Landroid/net/Uri;",
                &[(&uri_str).into()],
            )
            .map_err(|e| e.to_string())?
            .l()
            .map_err(|e| e.to_string())?;

        let mode_str = env.new_string("wt").map_err(|e| e.to_string())?;
        let stream = env
            .call_method(
                &resolver,
                "openOutputStream",
                "(Landroid/net/Uri;Ljava/lang/String;)Ljava/io/OutputStream;",
                &[(&parsed_uri).into(), (&mode_str).into()],
            )
            .map_err(|e| e.to_string())?
            .l()
            .map_err(|e| e.to_string())?;

        if stream.is_null() {
            return Err("Unable to open output stream for URI".into());
        }

        let byte_array = env.byte_array_from_slice(data.as_bytes()).map_err(|e| e.to_string())?;
        env.call_method(&stream, "write", "([B)V", &[(&byte_array).into()])
            .map_err(|e| e.to_string())?;
        let _ = env.call_method(&stream, "close", "()V", &[]);

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        std::fs::write(&uri, data).map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![write_content_uri])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
