package com.smshub.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
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
    private val requiredPermissions = arrayOf(
        Manifest.permission.READ_SMS,
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.SEND_SMS,
        Manifest.permission.RECEIVE_MMS,
        Manifest.permission.READ_CONTACTS
    )

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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
                }
            )
        }
    }
}
