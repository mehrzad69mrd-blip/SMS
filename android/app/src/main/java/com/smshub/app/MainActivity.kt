package com.smshub.app

import android.Manifest
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Telephony
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Native Jetpack Compose MainActivity that initializes SMS repositories and ViewModel,
 * handles request permission callbacks and displays Toast notifications.
 */
class MainActivity : ComponentActivity() {

    private lateinit var repository: SmsRepository
    private lateinit var viewModel: SmsViewModel

    // Required permissions for Full Default SMS functional support
    private val requiredPermissions: Array<String>
        get() {
            val list = mutableListOf(
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.SEND_SMS,
                Manifest.permission.RECEIVE_MMS,
                Manifest.permission.READ_CONTACTS
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                list.add("android.permission.POST_NOTIFICATIONS")
            }
            return list.toTypedArray()
        }

    // Permission launcher to handle multi-permission response
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            Toast.makeText(this, "Permissions granted! Loading SMS...", Toast.LENGTH_SHORT).show()
            viewModel.loadConversations()
        } else {
            Toast.makeText(this, "Some features may not function without permissions.", Toast.LENGTH_LONG).show()
        }
    }

    // Default SMS app launcher to prompt system change dialog
    private val defaultSmsLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ ->
        viewModel.updateDefaultSmsStatus()
    }

    /**
     * Checks if the current app is the default SMS app and, if not, requests to change it.
     */
    fun checkAndRequestDefaultSmsApp() {
        val packageName = packageName
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(Context.ROLE_SERVICE) as? RoleManager
            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
                if (!roleManager.isRoleHeld(RoleManager.ROLE_SMS)) {
                    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
                    defaultSmsLauncher.launch(intent)
                } else {
                    viewModel.updateDefaultSmsStatus()
                }
            } else {
                val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(this)
                if (defaultSmsPackage != packageName) {
                    val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
                        putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, packageName)
                    }
                    defaultSmsLauncher.launch(intent)
                }
            }
        } else {
            val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(this)
            if (defaultSmsPackage != packageName) {
                val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
                    putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, packageName)
                }
                defaultSmsLauncher.launch(intent)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::viewModel.isInitialized) {
            viewModel.updateDefaultSmsStatus()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        // Set status bar background color to match the main screen color (#F8FAFC)
        window.statusBarColor = android.graphics.Color.parseColor("#F8FAFC")
        // Set status bar icons to dark/black so they are visible on light backgrounds
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = true

        // Standard instantiation of domain components
        repository = SmsRepository(applicationContext)
        
        // Simple ViewModel Factory inline
        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return SmsViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory)[SmsViewModel::class.java]

        // Listen to SMS sending UI events for Toast feedback
        lifecycleScope.launch {
            viewModel.uiEvent.collectLatest { event ->
                when (event) {
                    is SmsUiEvent.SmsSentSuccess -> {
                        Toast.makeText(this@MainActivity, "Message sent successfully!", Toast.LENGTH_SHORT).show()
                    }
                    is SmsUiEvent.ShowError -> {
                        Toast.makeText(this@MainActivity, event.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        setContent {
            val hasPermissionState = requiredPermissions.all {
                ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
            }

            SmsApp(
                viewModel = viewModel,
                hasPermissions = hasPermissionState,
                onRequestPermissions = {
                    permissionLauncher.launch(requiredPermissions)
                },
                onRequestDefaultSmsApp = {
                    checkAndRequestDefaultSmsApp()
                }
            )
        }
    }
}
